#!/bin/bash

# Personal Assistant - Run Backend & Frontend Concurrently

# Exit immediately if a command exits with a non-zero status
set -e

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "Shutting down servers..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

# Register the cleanup function on script termination signals
trap cleanup EXIT INT TERM

echo "🚀 Starting Personal Assistant System..."

# 1. Start Backend Server
echo "⚡ Launching Backend (Express) in development watch mode..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 2. Start Frontend Server
echo "💻 Launching Frontend (Vite + React) development server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "--------------------------------------------------------"
echo "Assistant Hub is launching!"
echo "- Backend API: http://localhost:3000"
echo "- Frontend client logs will appear below..."
echo "Press Ctrl+C to terminate both servers."
echo "--------------------------------------------------------"

# Keep the script running to stream logs and wait for background processes
wait
