import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:8000",
})

console.log("✅ API Base URL:", api.defaults.baseURL); // ✅ works now

export default api
