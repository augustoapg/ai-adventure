'use client';
import { Scenario } from '@/interfaces';
import styles from './page.module.css';
import { useState } from 'react';

export default function Home() {
  const [inGame, setInGame] = useState(false);
  const [scenario, setScenario] = useState<Scenario>({ desc: '', options: [] });

  const getFirstDesc = async () => {
    const resJSON = await fetch('/api/firstScenario');
    const res = await resJSON.json();

    console.log(res);
    setScenario(res);
  };

  return (
    <main className={styles.main}>
      {!inGame && (
        <button
          className={styles.startGameButton}
          onClick={() => {
            setInGame(true);
            getFirstDesc();
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
                onClick={getFirstDesc}
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
