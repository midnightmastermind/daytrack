import axios from "axios";

const API_URL = "http://localhost:5000/api/goalprogress/";

const getAllGoalProgress = () => axios.get(API_URL);
const createGoalProgress = (data) => axios.post(API_URL, data);
const updateGoalProgress = (id, data) => axios.put(`${API_URL}${id}`, data);
const removeGoalProgress = (id) => axios.delete(`${API_URL}${id}`);

export default {
  getAllGoalProgress,
  createGoalProgress,
  updateGoalProgress,
  removeGoalProgress,
};