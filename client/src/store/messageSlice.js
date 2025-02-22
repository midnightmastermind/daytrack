import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchMessage = createAsyncThunk("message/fetchMessage", async () => {
  const response = await axios.get("http://localhost:5000/");
  return response.data.message;
});

const messageSlice = createSlice({
  name: "message",
  initialState: { value: "", status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessage.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMessage.fulfilled, (state, action) => {
        state.value = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchMessage.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default messageSlice.reducer;