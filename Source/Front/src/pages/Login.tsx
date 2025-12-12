import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const API_URL = window.location.origin + '/api';

// Типы для VK ID SDK
declare global {
  interface Window {
    VKIDSDK: any;
    YaAuthSuggest: any;
  }
}

const Login: React.FC = () => {
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [vkClientId, setVkClientId] = useState<string | null>(null);
  const [yandexClientId, setYandexClientId] = useState<string | null>(null);
  const vkWidgetRef = useRef<HTMLDivElement>(null);
  const yandexWidgetRef = useRef<HTMLDivElement>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Восстанавливаем состояние из localStorage
    const savedPhone = localStorage.getItem('verification_phone');
    const savedCodeSent = localStorage.getItem('verification_code_sent') === 'true';
    
    if (savedPhone) {
      setPhone(savedPhone);
      if (savedCodeSent) {
        setCodeSent(true);
      }
    }

    // Загружаем конфигурацию
    fetch(`${API_URL}/config`)
      .then(res => res.json())
      .then(config => {
        setVkClientId(config.vk_client_id);
        setYandexClientId(config.yandex_client_id);
      })
      .catch(err => console.error('Ошибка загрузки конфигурации:', err));

    // Загружаем SDK скрипты
    const vkScript = document.createElement('script');
    vkScript.src = 'https://unpkg.com/@vkid/sdk@3/dist-sdk/umd/index.js';
    vkScript.async = true;
    vkScript.crossOrigin = 'anonymous';
    document.head.appendChild(vkScript);

    const yandexScript = document.createElement('script');
    yandexScript.src = 'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js';
    yandexScript.async = true;
    document.head.appendChild(yandexScript);

    // Обработка токенов из localStorage при загрузке
    const checkStoredTokens = () => {
      const yandexToken = localStorage.getItem('yandex_oauth_token');
      if (yandexToken) {
        sendOAuthToken('yandex', yandexToken);
        localStorage.removeItem('yandex_oauth_token');
        localStorage.removeItem('yandex_oauth_token_type');
        localStorage.removeItem('yandex_oauth_expires_in');
        localStorage.removeItem('yandex_oauth_scope');
      }

      const vkToken = localStorage.getItem('vk_oauth_token');
      if (vkToken) {
        sendOAuthToken('vk', vkToken);
        localStorage.removeItem('vk_oauth_token');
        localStorage.removeItem('vk_oauth_expires_in');
        localStorage.removeItem('vk_oauth_user_id');
      }
    };

    checkStoredTokens();

    // Обработка postMessage от вспомогательных страниц
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data && event.data.access_token) {
        sendOAuthToken('yandex', event.data.access_token);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    // Инициализация OAuth после загрузки конфигурации и SDK
    if (vkClientId && vkWidgetRef.current) {
      setTimeout(() => initVKID(), 500);
    }
    if (yandexClientId && yandexWidgetRef.current) {
      setTimeout(() => initYandexID(), 500);
    }
  }, [vkClientId, yandexClientId]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const sendPhoneCode = async () => {
    if (!phone) {
      showMessage('Введите номер телефона', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Вам поступит звонок. Последние 4 цифры номера звонящего - это ваш код.', 'success');
        setCodeSent(true);
        // Сохраняем в localStorage
        localStorage.setItem('verification_phone', phone);
        localStorage.setItem('verification_code_sent', 'true');
      } else {
        showMessage(data.detail || 'Ошибка отправки звонка', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!code) {
      showMessage('Введите код верификации', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        // Очищаем localStorage после успешного входа
        localStorage.removeItem('verification_phone');
        localStorage.removeItem('verification_code_sent');
        login(data.access_token, data.refresh_token);
        navigate('/event');
      } else {
        showMessage(data.detail || 'Неверный код', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOAuthToken = async (provider: 'vk' | 'yandex', accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/oauth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        login(data.access_token, data.refresh_token);
        navigate('/event');
      } else {
        showMessage(data.detail || 'Ошибка авторизации', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    }
  };

  const initVKID = () => {
    if (!vkWidgetRef.current || !vkClientId) return;

    // Проверяем загрузку SDK с задержкой
    const checkSDK = () => {
      if (!('VKIDSDK' in window)) {
        console.warn('VK ID SDK еще не загружен, повторная попытка...');
        setTimeout(checkSDK, 500);
        return;
      }

      try {
        const VKID = (window as any).VKIDSDK;
        const redirectUrl = window.location.origin + '/vk-token.html';
        
        // Инициализация конфигурации
        VKID.Config.init({
          app: parseInt(vkClientId),
          redirectUrl: redirectUrl,
          state: 'vk-auth-state',
        });

        // Создаем кнопку вручную с правильной иконкой
        if (vkWidgetRef.current) {
          const button = document.createElement('button');
          button.className = 'oauth-btn-square vk';
          button.innerHTML = `
            <div class="oauth-btn-icon">
              <img src="/images/VK_icon.svg" alt="VK" />
            </div>
          `;
          button.onclick = () => {
            VKID.Auth.login({
              uuid: 'uuid-' + Date.now(),
              scope: 'phone email'
            })
            .then((data: any) => {
              if (data && data.code && data.device_id) {
                // Обмениваем код на токен через наш бэкенд
                fetch(`${API_URL}/auth/oauth/exchange-code`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    provider: 'vk',
                    code: data.code,
                    redirect_uri: redirectUrl
                  }),
                })
                .then(res => res.json())
                .then(tokenData => {
                  if (tokenData && tokenData.access_token) {
                    sendOAuthToken('vk', tokenData.access_token);
                  } else {
                    showMessage('Не удалось получить токен VK', 'error');
                  }
                })
                .catch((error: any) => {
                  console.error('VK ID Exchange Error:', error);
                  showMessage('Ошибка обмена кода на токен VK', 'error');
                });
              } else if (data && data.access_token) {
                sendOAuthToken('vk', data.access_token);
              } else {
                showMessage('Не удалось получить данные от VK', 'error');
              }
            })
            .catch((error: any) => {
              console.error('VK ID Login Error:', error);
              showMessage('Ошибка авторизации VK', 'error');
            });
          };
          vkWidgetRef.current.innerHTML = '';
          vkWidgetRef.current.appendChild(button);
        }
      } catch (error) {
        console.error('VK ID Init Error:', error);
        // Fallback - простая кнопка с редиректом
        if (vkWidgetRef.current) {
          const button = document.createElement('button');
          button.className = 'oauth-btn-square vk';
          button.innerHTML = `
            <div class="oauth-btn-icon">
              <img src="/images/VK_icon.svg" alt="VK" />
            </div>
          `;
          button.onclick = () => {
            const redirectUrl = encodeURIComponent(window.location.origin + '/vk-token.html');
            window.location.href = `https://oauth.vk.com/authorize?client_id=${vkClientId}&display=page&redirect_uri=${redirectUrl}&scope=phone,email&response_type=code&v=5.131`;
          };
          vkWidgetRef.current.innerHTML = '';
          vkWidgetRef.current.appendChild(button);
        }
      }
    };

    // Запускаем проверку
    setTimeout(checkSDK, 1000);
  };

  const initYandexID = () => {
    if (!yandexWidgetRef.current || !yandexClientId) return;

    const redirectUri = window.location.origin + '/yandex-token.html';
    
    // Проверяем загрузку SDK с задержкой
    const checkSDK = () => {
      if (typeof window.YaAuthSuggest === 'undefined') {
        console.warn('Yandex ID SDK еще не загружен, повторная попытка...');
        setTimeout(checkSDK, 500);
        return;
      }

      try {
        window.YaAuthSuggest.init(
          {
            client_id: yandexClientId,
            response_type: 'token',
            redirect_uri: redirectUri
          },
          window.location.origin
        )
        .then(({ handler }: any) => {
          // Создаем кнопку с правильной иконкой Яндекс
          const button = document.createElement('button');
          button.className = 'oauth-btn-square yandex';
          button.innerHTML = `
            <div class="oauth-btn-icon">
              <img src="/images/Yandex_icon.svg" alt="Yandex" />
            </div>
          `;
          button.onclick = () => {
            handler()
              .then((data: any) => {
                if (data && data.access_token) {
                  sendOAuthToken('yandex', data.access_token);
                } else {
                  showMessage('Токен не получен от Яндекс', 'error');
                }
              })
              .catch((error: any) => {
                console.error('Yandex Auth Error:', error);
                showMessage('Ошибка авторизации Яндекс', 'error');
              });
          };
          if (yandexWidgetRef.current) {
            yandexWidgetRef.current.innerHTML = '';
            yandexWidgetRef.current.appendChild(button);
          }
        })
        .catch((error: any) => {
          console.error('Yandex ID Init Error:', error);
          // Fallback - обычный OAuth redirect
          createYandexFallbackButton();
        });
      } catch (error) {
        console.error('Yandex ID Init Error:', error);
        createYandexFallbackButton();
      }
    };

    const createYandexFallbackButton = () => {
      if (yandexWidgetRef.current) {
        const button = document.createElement('button');
        button.className = 'oauth-btn-square yandex';
        button.innerHTML = `
          <div class="oauth-btn-icon">
            <img src="/images/Yandex_icon.svg" alt="Yandex" />
          </div>
        `;
        button.onclick = () => {
          const redirectUriEncoded = encodeURIComponent(redirectUri);
          const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${yandexClientId}&redirect_uri=${redirectUriEncoded}`;
          window.location.href = authUrl;
        };
        yandexWidgetRef.current.innerHTML = '';
        yandexWidgetRef.current.appendChild(button);
      }
    };

    // Запускаем проверку
    setTimeout(checkSDK, 1000);
  };

  const publicUrl = process.env.PUBLIC_URL || '';

  return (
    <div className="login-container">
      <div 
        className="login-decoration-left"
        style={{
          backgroundImage: `url(/images/vine-left.svg)`
        }}
      ></div>
      <div 
        className="login-decoration-right"
        style={{
          backgroundImage: `url(/images/vine-right.svg)`
        }}
      ></div>
      <motion.div 
        className="login-box"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Вход в систему
        </motion.h1>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="phone-section">
          <div className="form-group">
            <label htmlFor="phone">Номер телефона</label>
            <div className="phone-input-wrapper">
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => {
                  let value = e.target.value;
                  // Если пользователь удалил +7, добавляем обратно
                  if (!value.startsWith('+7')) {
                    if (value.startsWith('+')) {
                      value = '+7' + value.slice(1);
                    } else if (value.startsWith('7')) {
                      value = '+7' + value.slice(1);
                    } else if (value.startsWith('8')) {
                      value = '+7' + value.slice(1);
                    } else {
                      value = '+7' + value;
                    }
                  }
                  // Ограничиваем длину (максимум 12 символов: +7XXXXXXXXXX)
                  if (value.length <= 12) {
                    setPhone(value);
                  }
                }}
                placeholder="+7 (999) 123-45-67"
                disabled={codeSent}
                className={codeSent ? 'disabled' : ''}
              />
              <motion.button 
                className="btn-call" 
                onClick={sendPhoneCode}
                disabled={isLoading || !phone || codeSent}
                whileHover={!isLoading && phone && !codeSent ? { scale: 1.05, y: -2 } : {}}
                whileTap={!isLoading && phone && !codeSent ? { scale: 0.98 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                title="Позвонить"
              >
                {isLoading ? (
                  <span>...</span>
                ) : (
                  <img 
                    src="/images/phone-icon.svg" 
                    alt="Позвонить" 
                    className="phone-icon"
                  />
                )}
              </motion.button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="code">Код верификации</label>
            <div className="code-input">
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Последние 4 цифры номера"
                maxLength={4}
                disabled={!codeSent}
                className={!codeSent ? 'disabled' : ''}
              />
            </div>
          </div>
          <p className="hint">Вам поступит звонок. Последние 4 цифры номера звонящего - это ваш код верификации.</p>

          <motion.button 
            className="btn btn-primary" 
            onClick={verifyPhoneCode}
            disabled={!codeSent || !code || isLoading}
            whileHover={codeSent && code && !isLoading ? { scale: 1.05, y: -2 } : {}}
            whileTap={codeSent && code && !isLoading ? { scale: 0.98 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <span>{isLoading ? '...' : 'Войти'}</span>
          </motion.button>
        </div>

        <div className="divider">или</div>

        <div className="oauth-buttons">
          <div ref={vkWidgetRef} className="oauth-widget"></div>
          <div ref={yandexWidgetRef} className="oauth-widget"></div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

