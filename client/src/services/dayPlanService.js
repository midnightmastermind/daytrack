import axios from 'axios';

const API_URL = 'http://localhost:5000/api/dayplans';

const getAllDayPlans = () => axios.get(`${API_URL}/all`);
const getDayPlan = (date) => axios.get(API_URL, { params: { date } });
const createDayPlan = (dayPlanData) => axios.post(API_URL, dayPlanData);
const updateDayPlan = (id, dayPlanData) => axios.put(`${API_URL}/${id}`, dayPlanData);
const deleteDayPlan = (id) => axios.delete(`${API_URL}/${id}`);

export default { getAllDayPlans, getDayPlan, createDayPlan, updateDayPlan, deleteDayPlan };
