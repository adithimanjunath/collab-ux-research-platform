from flask import request
from collections import defaultdict
from flask_socketio import rooms
from flask_socketio import SocketIO, emit, join_room, leave_room
from firebase_admin import auth as fb_auth
from services.note_service import create_note, update_note, delete_note
from auth.firebase_verify import verify_firebase_token

socketio = SocketIO(cors_allowed_origins="*")

# Optional: socket presence (can be removed if only Firestore presence is used)
online_users = {}
pending_requests = defaultdict(dict) 
approved = defaultdict(set) 
sid_to_uid = {}
latest_sid_by_uid = {}              # { uid: sid }
pending_by_uid     = {}             # { board_id: { uid: {name,email} } }
pending_sid_by_uid = {}             # { board_id: { uid: sid } }

def _broadcast_user_list(board_id):
    users = online_users.get(board_id, {})
    emit(
        "user_list",
        {
            "boardId": board_id,
            "users": [
                {"uid": uid, "name": u["name"], "email": u["email"]}
                for uid, u in users.items()
            ],
        },
        room=board_id
    )

def _room_sids(socketio, board_id, namespace="/"):
    """Return a set of sids currently in the Socket.IO room (server truth)."""
    mgr = socketio.server.manager
    try:
        # python-socketio >= 5
        return set(mgr.rooms.get(namespace, {}).get(board_id, set()))
    except Exception:
        try:
            # fallback API
            return set(mgr.get_participants(namespace, board_id))
        except Exception:
            return set()
pass

def _occupied_by_other(socketio, board_id, uid):
    """True if the room has at least one sid owned by a different uid."""
    sids = _room_sids(socketio, board_id)
    if not sids:
        return False
    for s in sids:
        owner = sid_to_uid.get(s)
        if owner and owner != uid:
            return True
    # If room has sids but we don't know their uid yet, treat as occupied (safer)
    return any(s for s in sids if s not in sid_to_uid)

# -------------------------
# Join/Leave Board
# -------------------------
def register_socket_events(socketio):
    @socketio.on("join_board")
    def join_board(data):
        token = data.get("token")
        board_id = data.get("boardId")
        decoded = fb_auth.verify_id_token(token)
        if not decoded:
            emit("join_denied", {"reason": "Invalid or missing token"})
            return

        uid   = decoded["uid"]
        name  = decoded.get("name") or decoded.get("displayName") or "User"
        email = decoded.get("email") or ""
        sid   = request.sid
        latest_sid_by_uid[uid] = sid

        is_occupied_by_others = _occupied_by_other(socketio, board_id, uid)

        if is_occupied_by_others:
            # Approval is needed
            pend_uid = pending_by_uid.setdefault(board_id, {})
            pend_sid = pending_sid_by_uid.setdefault(board_id, {})
            pend_uid[uid] = {"uid": uid, "name": name, "email": email}
            pend_sid[uid] = sid

            emit("waiting_for_approval", {"boardId": board_id}, room=sid)

            payload = {
            "boardId": board_id,
            "sid": sid,
            "user": {"uid": uid, "name": name, "email": email},
        }
            emit("join_request", payload, room=board_id)
            
            for occ_uid, occ_info in online_users.get(board_id, {}).items():
                for s in list(occ_info.get("sockets", set())):
                    emit("join_request", payload, room=s)

            print(f"🛎 Approval needed: {name} ({uid}) requests board {board_id}, sid={sid}")
            return

        join_room(board_id)
        sid_to_uid[sid] = uid

        board_users = online_users.setdefault(board_id, {})
        user_entry = board_users.setdefault(uid, {"name": name, "email": email, "sockets": set()})
        user_entry["sockets"].add(sid)

        print(f"✅ Auto join: {name} ({uid}) AUTO joined room {board_id} ")
        emit("join_granted", {"boardId": board_id}, room=sid)
    
# @socketio.on("request_join") 
# def handle_request_join(data):
#     board_id = data.get("boardId")
#     user = data.get("user")
#     sid = request.sid

#     # Remember who’s waiting (so we can approve by sid)
#     pend = pending_requests.setdefault(board_id, {})
#     pend[sid] = user

#     print(f"🛎 request_join from {user.get('name')} for {board_id}, sid={sid}")

#     # Tell requester they are waiting
#     emit("waiting_for_approval", {"boardId": board_id})

#     # Notify everyone already inside the board room
#     emit("join_request", {"boardId": board_id, "sid": sid, "user": user}, room=board_id)

@socketio.on("approve_user")
def approve_user(data):
    board_id = data.get("boardId")
    uid_to_approve = data.get("uid")

    pend_uid_map = pending_by_uid.get(board_id, {})
    pend_sid_map = pending_sid_by_uid.get(board_id, {})

    user_info = pend_uid_map.pop(uid_to_approve, None)
    target_sid = pend_sid_map.pop(uid_to_approve, None)
    if not user_info or not target_sid:
        print(f"⚠️ Approval failed: could not find pending user {uid_to_approve}")
        return

    print(f"✅ Approving user: {user_info['name']} ({uid_to_approve})")
        # Manually add their socket to the room
    socketio.server.enter_room(target_sid, board_id)
    sid_to_uid[target_sid] = uid_to_approve

        # Add to our presence tracking
    board_users = online_users.setdefault(board_id, {})
    user_entry = board_users.setdefault(uid_to_approve, {"name": user_info["name"], "email": user_info["email"], "sockets": set()})
    user_entry["sockets"].add(target_sid)

        # 3. Tell the approved user they are in
    emit("join_granted", {"boardId": board_id}, room=target_sid)
        
        # 4. (Optional but good) Tell everyone else someone new joined
    emit("join_approved_broadcast", {"boardId": board_id, "user": user_info}, room=board_id)


@socketio.on("reject_user")
def reject_user(data):
    board_id = data.get("boardId")
    uid_to_reject = data.get("uid")

    pend_uid_map = pending_by_uid.get(board_id, {})
    pend_sid_map = pending_sid_by_uid.get(board_id, {})

    user_info = pend_uid_map.pop(uid_to_reject, None)
    target_sid = pend_sid_map.pop(uid_to_reject, None)

    if user_info and target_sid:
        print(f"❌ Rejecting user: {user_info['name']} ({uid_to_reject})")
        emit("join_rejected", {"boardId": board_id}, room=target_sid)

@socketio.on("leave_board")
def leave_board(data):
        board_id = data.get("boardId")
        sid = request.sid
        leave_room(board_id)
        sid_to_uid.pop(sid, None)  
        if board_id in online_users:
            for uid in list(online_users[board_id].keys()):
                online_users[board_id][uid]["sockets"].discard(sid)
                if not online_users[board_id][uid]["sockets"]:
                    del online_users[board_id][uid]
            _broadcast_user_list(board_id)
        print(f"🚪 Socket {sid} left board {board_id}")

@socketio.on("disconnect")
def disconnect():
    sid = request.sid
    uid = sid_to_uid.pop(sid, None)
    print(f"🔌 Socket {sid} disconnected")

    # remove from online_users
    for board_id in list(online_users.keys()):
        for u in list(online_users[board_id].keys()):
            online_users[board_id][u]["sockets"].discard(sid)
            if not online_users[board_id][u]["sockets"]:
                del online_users[board_id][u]
        _broadcast_user_list(board_id)

    # purge from pending (uid/sid maps)
    for board_id in list(pending_sid_by_uid.keys()):
        sid_map = pending_sid_by_uid[board_id]
        uid_map = pending_by_uid[board_id]
        for pending_uid, pending_sid in list(sid_map.items()):
            if pending_sid == sid or (uid and pending_uid == uid):
                sid_map.pop(pending_uid, None)
                uid_map.pop(pending_uid, None)


    # -------------------------
    # Note Events
    # -------------------------
@socketio.on("create_note")
def handle_create_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        create_note(data)
        data.pop("_id", None)
        print(f"📝 Broadcasting new note to room {data['boardId']}")
        emit("new_note", data, room=data["boardId"], include_self=False)

@socketio.on("edit_note")
def handle_edit_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        update_note(data["id"], {
            "text": data["text"],
            "x": data["x"],
            "y": data["y"],
            "user": data["user"]
        })
        print(f"✏️ Broadcasting edited note {data['id']} to room {data['boardId']}")
        emit("note_edited", data, room=data["boardId"], include_self=False)

@socketio.on("move_note")
def handle_move_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        update_note(data["id"], {"x": data["x"], "y": data["y"]})
        print(f"📍 Broadcasting moved note {data['id']} to room {data['boardId']}")
        emit("note_moved", data, room=data["boardId"], include_self=False)

@socketio.on("delete_note")
def handle_delete_note(data):
        token = data.get("token")
        decoded = verify_firebase_token(token)
        if not decoded:
            emit("Unauthorized", {"message": "Invalid or missing token"})
            return

        delete_note(data["id"])
        print(f"🗑 Broadcasting deleted note {data['id']} to room {data['boardId']}")
        emit("note_deleted", {"id": data["id"]}, room=data["boardId"], include_self=False)
