import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Task = {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
};

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTasks() {
    setLoading(true);
    setError(null);

    try {
      // Calculate start and end of "Today" to filter the query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Query: 
      // 1. Status is NOT completed
      // 2. due_at is greater than or equal to start of today
      // 3. due_at is less than start of tomorrow
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .neq("status", "completed") 
        .gte("due_at", today.toISOString())
        .lt("due_at", tomorrow.toISOString())
        .order("due_at", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(id: string) {
    try {
      // Optimistic update: Update UI immediately before server responds
      setTasks((prev) => prev.filter((t) => t.id !== id));

      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) {
        throw error;
      }
      
      // Optional: strictly re-fetch to ensure sync, 
      // but purely optimistic is fine for this scope.
      // await fetchTasks(); 

    } catch (err: any) {
      console.error(err);
      alert("Failed to update task");
      // Revert optimistic update on error would go here
      fetchTasks(); 
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Today&apos;s Tasks</h1>
      {tasks.length === 0 && <p>No tasks due today 🎉</p>}

      {tasks.length > 0 && (
        <table border={1} cellPadding={10} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Type</th>
              <th>Application ID</th>
              <th>Due At</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td style={{ textTransform: "capitalize" }}>{t.type}</td>
                <td style={{ fontFamily: "monospace" }}>{t.application_id}</td>
                <td>{new Date(t.due_at).toLocaleString()}</td>
                <td>{t.status}</td>
                <td>
                  <button 
                    onClick={() => markComplete(t.id)}
                    style={{ cursor: "pointer", padding: "5px 10px" }}
                  >
                    Mark Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}