import { apiFetch } from "./api";

export async function getGreet() {
  return apiFetch<{ message: string }>("/getGreet");
}
