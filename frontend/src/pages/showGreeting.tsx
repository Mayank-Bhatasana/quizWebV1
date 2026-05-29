import { useEffect, useState } from "react";
import { getGreet } from "../services/getGreet.ts";

export function ShowGreet() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchGreet() {
      const data = await getGreet();
      setMessage(data.message);
    }

    fetchGreet();
  }, []);

  return (
    <>
      <h1>{message}</h1>
    </>
  );
}
