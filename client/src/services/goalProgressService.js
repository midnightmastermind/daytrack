import axios from 'axios';

const API_URL = 'http://localhost:5000/api/goalprogress/';

// Expect destructured props to enforce camelCase usage
const getGoalProgress = () => axios.get(API_URL);

const createGoalProgress = ({ goalId, taskId, date, count }) => {
  return axios.post(API_URL, {
    goalId,     // ✅ Explicit camelCase keys
    taskId,
    date,
    count,
  });
};

const updateGoalProgress = (id, data) => axios.put(`${API_URL}${id}`, data);

const deleteGoalProgress = (id) => axios.delete(`${API_URL}${id}`);

export default {
  getGoalProgress,
  createGoalProgress,
  updateGoalProgress,
  deleteGoalProgress,
};
