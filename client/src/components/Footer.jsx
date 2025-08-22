

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 text-sm text-gray-500">
      © {year} Collaborative UX Research Platform | Made by Adithi M Shrouthy
    </footer>
  );
}
