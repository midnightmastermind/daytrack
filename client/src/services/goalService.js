import axios from 'axios';

const API_URL = 'http://localhost:5000/api/goals/';

const getGoals = () => {
  return axios.get(API_URL);
};

const createGoal = (goalData) => {
  return axios.post(API_URL, goalData);
};

const updateGoal = (id, goalData) => {
  return axios.put(API_URL + id, goalData);
};

const deleteGoal = (id) => {
  return axios.delete(API_URL + id);
};

export default {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};
