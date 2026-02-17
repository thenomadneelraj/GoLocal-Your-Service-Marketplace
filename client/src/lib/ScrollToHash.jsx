import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ScrollToHash() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 🔥 If page is loaded with a hash, remove it
    if (location.hash) {
      navigate("/", { replace: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []); // run ONLY on first load

  return null;
}
