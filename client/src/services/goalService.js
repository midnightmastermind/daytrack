import axios from 'axios';

const API_URL = 'http://localhost:5000/api/goals';

const getGoals = () => axios.get(API_URL);

const bulkReorderGoals = (goals) => axios.put(`${API_URL}/reorder`, goals);

const createGoal = (goalData) => axios.post(API_URL, goalData);

const updateGoal = (id, goalData) => axios.put(`${API_URL}/${id}`, goalData);

const deleteGoal = (id) => axios.delete(`${API_URL}/${id}`);

export default {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  bulkReorderGoals // ✅ now matches taskService.js format
};
