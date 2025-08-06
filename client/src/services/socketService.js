import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5050", {
  transports: ["websocket"],       // force websocket transport
  withCredentials: true,           // send cookies if needed
});

export default socket;
