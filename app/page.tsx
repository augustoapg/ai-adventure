'use client';
import { Scenario } from '@/interfaces';
import { languages, themes } from '@/lib/constants';
import clsx from 'clsx';
import { useState } from 'react';
import styles from './page.module.css';
import Image from 'next/image';
import RightArrow from '../public/right-arrow.svg';

export default function Home() {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState(languages[0].id);
  const [theme, setTheme] = useState(themes[0]);
  const [inGame, setInGame] = useState(false);
  const [scenario, setScenario] = useState<Scenario>({ desc: '', options: [] });
  const [optionChosen, setOptionChosen] = useState('');
  const [customOption, setCustomOption] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetGame = () => {
    setScenario({ desc: '', options: [] });
    setOptionChosen('');
    setIsLoading(false);
  };

  const generateScenario = async (optionChosen?: string) => {
    setIsLoading(true);
    setOptionChosen(optionChosen ?? '');
    const body = {
      name: name || 'Liam',
      language,
      theme: theme.name,
      optionChosen,
    };

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
    setIsLoading(false);
    setOptionChosen('');
    console.log(theme, language, name);
  };

  const getOptionBtnClass = (optId: string) => {
    return clsx({
      [styles.optionChosenBtn]: optionChosen === optId,
      [styles.disabledBtn]: isLoading,
      [styles.decisionButton]: true,
    });
  };

  return (
    <main className={styles.main}>
      {!inGame && (
        <div className={styles.preGameContainer}>
          <input
            className={styles.nameInput}
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="What is your name?"
          />
          <ul className={styles.themes}>
            {themes.map((themeOpt) => (
              <li
                key={themeOpt.id}
                onClick={() => setTheme(themeOpt)}
                style={{
                  filter:
                    theme.id === themeOpt.id
                      ? 'brightness(100%)'
                      : 'brightness(40%)',
                }}
              >
                {themeOpt.name}
              </li>
            ))}
          </ul>
          <ul className={styles.languages}>
            {languages.map((langOpt) => (
              <li
                key={langOpt.id}
                onClick={() => setLanguage(langOpt.id)}
                style={{
                  filter:
                    language === langOpt.id
                      ? 'brightness(100%)'
                      : 'brightness(40%)',
                }}
              >
                <Image
                  src={`/${langOpt.flag}`}
                  alt={langOpt.name}
                  width={32}
                  height={32}
                />
              </li>
            ))}
          </ul>
          <div></div>
          <button
            className={styles.startGameButton}
            onClick={() => {
              setInGame(true);
              generateScenario();
            }}
          >
            LET THE ADVENTURE BEGIN!
          </button>
        </div>
      )}

      {inGame && (
        <div className={styles.gameContainer}>
          <p className={styles.scenarioDescription}>{scenario.desc}</p>
          <div className={styles.customOptionContainer}>
            <p>What do you do?</p>
            <div className={styles.customOptionInputContainer}>
              <input
                className={styles.customOptionInput}
                type="text"
                value={customOption}
                onChange={(e) => setCustomOption(e.target.value)}
              />
              <RightArrow
                className={styles.customOptionSubmit}
                onClick={() => console.log(customOption)}
              />
            </div>
          </div>
          <p>Or pick one of these options:</p>
          <div className={styles.optionsContainer}>
            {scenario.options.map((option) => (
              <button
                key={option.id}
                className={getOptionBtnClass(option.id)}
                onClick={() => generateScenario(option.id)}
                disabled={isLoading}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {inGame && scenario.desc && scenario.options.length === 0 && (
        <button className={styles.playAgainBtn} onClick={resetGame}>
          Play again?
        </button>
      )}
    </main>
  );
}
