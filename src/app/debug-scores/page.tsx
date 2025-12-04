"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initializeUserSession } from "@/lib/userSession";
import { getUserGameRecords, getUserGems } from "@/lib/gamification";

export default function DebugScoresPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [gameRecords, setGameRecords] = useState<Record<string, number>>({});
  const [totalGems, setTotalGems] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user ID
        const id = await initializeUserSession('math');
        setUserId(id);

        if (id) {
          // Fetch game records
          const records = await getUserGameRecords(id);
          setGameRecords(records);

          // Fetch total gems
          const gems = await getUserGems(id);
          setTotalGems(gems);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recordsArray = Object.entries(gameRecords).sort(([a], [b]) => a.localeCompare(b));
  const hasRecords = recordsArray.length > 0;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#333'
        }}>
          🔍 Score Debug Page
        </h1>
        
        <Link 
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '2rem',
            color: '#667eea',
            textDecoration: 'none',
            fontSize: '0.95rem'
          }}
        >
          ← Back to Home
        </Link>

        {loading ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            color: '#666'
          }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{ 
            padding: '1rem', 
            background: '#fee',
            borderRadius: '8px',
            color: '#c00',
            marginBottom: '1rem'
          }}>
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <>
            {/* User ID Section */}
            <div style={{ 
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                marginBottom: '0.5rem',
                color: '#333'
              }}>
                👤 User Information
              </h2>
              <div style={{ 
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: '#666',
                wordBreak: 'break-all'
              }}>
                <strong>User ID:</strong> {userId || 'Not found'}
              </div>
              <div style={{ 
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                <strong>Total Gems:</strong> 💎 {totalGems}
              </div>
            </div>

            {/* Game Records Section */}
            <div>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                marginBottom: '1rem',
                color: '#333'
              }}>
                🎮 Game Records ({recordsArray.length} games played)
              </h2>
              
              {!hasRecords ? (
                <div style={{ 
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  color: '#666'
                }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    No game records yet!
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>
                    Play some games to see your scores here.
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid',
                  gap: '1rem'
                }}>
                  {recordsArray.map(([gameName, score]) => (
                    <div 
                      key={gameName}
                      style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    >
                      <span style={{ 
                        fontWeight: '600',
                        fontSize: '1rem'
                      }}>
                        {gameName}
                      </span>
                      <span style={{ 
                        fontSize: '1.25rem',
                        fontWeight: 'bold'
                      }}>
                        💎 {score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div style={{ 
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#e3f2fd',
              borderRadius: '8px',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: '#1565c0'
            }}>
              <h3 style={{ 
                fontWeight: '600', 
                marginBottom: '0.5rem',
                color: '#0d47a1'
              }}>
                💡 How It Works
              </h3>
              <ul style={{ 
                marginLeft: '1.5rem',
                marginTop: '0.5rem'
              }}>
                <li>Each time you play a game, your score is saved</li>
                <li>Only your <strong>highest score</strong> for each game is stored</li>
                <li>When you beat your record, you earn gems = (new score - old score)</li>
                <li>Your User ID is stored in browser localStorage</li>
                <li>Scores are synced across all puzzle pages</li>
              </ul>
            </div>

            {/* Quick Links */}
            <div style={{ 
              marginTop: '2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <Link 
                href="/math-puzzle"
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'transform 0.2s'
                }}
              >
                🧩 Math Puzzle
              </Link>
              <Link 
                href="/memory-puzzle"
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'transform 0.2s'
                }}
              >
                🧠 Memory Puzzle
              </Link>
              <Link 
                href="/train-your-brain"
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #db2777 100%)',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  transition: 'transform 0.2s'
                }}
              >
                ⚡ Train Your Brain
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

