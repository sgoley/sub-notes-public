#!/bin/bash

# Start Supabase local development environment
echo "🚀 Starting Supabase local development environment..."
supabase start &
SUPABASE_PID=$!

# Wait for Supabase to be ready
echo "⏳ Waiting for Supabase to initialize..."
sleep 5

# Serve edge functions
echo "🔧 Serving Edge Functions..."
supabase functions serve &
FUNCTIONS_PID=$!

# Start Vite dev server
echo "⚡ Starting Vite development server..."
npm run dev &
VITE_PID=$!

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $VITE_PID 2>/dev/null
    kill $FUNCTIONS_PID 2>/dev/null
    supabase stop
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "✅ All services started!"
echo "   - Frontend: http://localhost:8080"
echo "   - Supabase Studio: http://localhost:54323"
echo "   - Edge Functions: http://localhost:54321/functions/v1"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait
