import axios from 'axios';

const API_URL = 'http://localhost:5000/api/tasks';

const getTasks = () => axios.get(API_URL);

const createTask = (taskData) => axios.post(API_URL, taskData);

const updateTask = (id, taskData) => axios.put(`${API_URL}/${id}`, taskData);

const deleteTask = (id) => axios.delete(`${API_URL}/${id}`);

export default { getTasks, createTask, updateTask, deleteTask };
