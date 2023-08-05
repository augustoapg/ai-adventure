'use client';
import { Scenario } from '@/interfaces';
import styles from './page.module.css';
import { useState } from 'react';

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const [scenario, setScenario] = useState<Scenario>({ desc: '', options: [] });

  const generateScenario = async (optionChosen?: string) => {
    const body = optionChosen ? { optionChosen } : {};
    const resJSON = await fetch('/api/generateScenario', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const res = await resJSON.json();
    setScenario(res);
  };

  return (
    <main className={styles.main}>
      {!inGame && (
        <button
          className={styles.startGameButton}
          onClick={() => {
            setInGame(true);
            generateScenario();
          }}
        >
          LET THE ADVENTURE BEGIN!
        </button>
      )}

      {inGame && (
        <div className={styles.gameContainer}>
          <p className={styles.scenarioDescription}>{scenario.desc}</p>
          <div className={styles.optionsContainer}>
            {scenario.options.map((option) => (
              <button
                key={option.id}
                className={styles.decisionButton}
                onClick={() => generateScenario(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
