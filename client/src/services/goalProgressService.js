import axios from 'axios';

const API_URL = 'http://localhost:5000/api/goalprogress/';

const getGoalProgress = () => {
  return axios.get(API_URL);
};

const createGoalProgress = (data) => {
  return axios.post(API_URL, data);
};

const updateGoalProgress = (id, data) => {
  return axios.put(API_URL + id, data);
};

const deleteGoalProgress = (id) => {
  return axios.delete(API_URL + id);
};

export default {
  getGoalProgress,
  createGoalProgress,
  updateGoalProgress,
  deleteGoalProgress,
};
