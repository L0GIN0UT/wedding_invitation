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
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [vkClientId, setVkClientId] = useState<string | null>(null);
  const [yandexClientId, setYandexClientId] = useState<string | null>(null);
  const vkWidgetRef = useRef<HTMLDivElement>(null);
  const yandexWidgetRef = useRef<HTMLDivElement>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
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
    vkScript.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js';
    vkScript.async = true;
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

    try {
      const response = await fetch(`${API_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Вам поступит звонок. Последние 4 цифры номера звонящего - это ваш код.', 'success');
        setShowCodeInput(true);
      } else {
        showMessage(data.detail || 'Ошибка отправки звонка', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    }
  };

  const verifyPhoneCode = async () => {
    if (!code) {
      showMessage('Введите код верификации', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        login(data.access_token, data.refresh_token);
        navigate('/event');
      } else {
        showMessage(data.detail || 'Неверный код', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
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

    if (!('VKIDSDK' in window)) {
      console.error('VK ID SDK не загружен');
      if (vkWidgetRef.current) {
        vkWidgetRef.current.innerHTML = '<p style="color: #666; font-size: 14px;">VK ID SDK не загружен</p>';
      }
      return;
    }

    const VKID = window.VKIDSDK;
    const redirectUrl = window.location.origin + '/vk-token.html';
    
    // Определяем, используем ли мы локальную сеть
    const isLocalNetwork = window.location.hostname.startsWith('192.168.') ||
                          window.location.hostname.startsWith('10.') ||
                          window.location.hostname.startsWith('172.');
    
    // Для локальной сети используем localhost
    const finalRedirectUrl = isLocalNetwork 
      ? `http://localhost:${window.location.port || 8080}/vk-token.html`
      : redirectUrl;

    try {
      VKID.Config.init({
        app: vkClientId,
        redirectUrl: finalRedirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: 'phone email',
      });

      const oneTap = new VKID.OneTap();

      oneTap.render({
        container: vkWidgetRef.current,
        showAlternativeLogin: true,
        styles: {
          width: 70,
          height: 70
        }
      })
      .on(VKID.WidgetEvents.ERROR, (error: any) => {
        console.error('VK ID OneTap Error:', error);
        // Fallback - создаем кнопку вручную
        if (vkWidgetRef.current) {
          const publicUrl = process.env.PUBLIC_URL || '';
          const button = document.createElement('button');
          button.className = 'oauth-btn-square vk';
          button.innerHTML = `
            <div class="oauth-btn-icon">
              <img src="${publicUrl}/images/VK_icon.svg" alt="VK" />
            </div>
          `;
          button.onclick = () => {
            VKID.Auth.login({
              uuid: 'uuid-' + Date.now(),
              scope: 'phone email'
            })
            .then((data: any) => {
              if (data && data.code && data.device_id) {
                VKID.Auth.exchangeCode(data.code, data.device_id)
                  .then((tokenData: any) => {
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
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload: any) => {
        const code = payload.code;
        const deviceId = payload.device_id;

        VKID.Auth.exchangeCode(code, deviceId)
          .then((data: any) => {
            if (data && data.access_token) {
              sendOAuthToken('vk', data.access_token);
            } else {
              showMessage('Не удалось получить токен VK', 'error');
            }
          })
          .catch((error: any) => {
            console.error('VK ID Exchange Error:', error);
            showMessage('Ошибка обмена кода на токен VK', 'error');
          });
      });
    } catch (error) {
      console.error('VK ID Init Error:', error);
      showMessage('Ошибка инициализации VK ID', 'error');
    }
  };

  const initYandexID = () => {
    if (!yandexWidgetRef.current || !yandexClientId) return;

    if (typeof window.YaAuthSuggest === 'undefined') {
      console.error('Yandex ID SDK не загружен');
      if (yandexWidgetRef.current) {
        yandexWidgetRef.current.innerHTML = '<p style="color: #666; font-size: 14px;">Яндекс ID SDK не загружен</p>';
      }
      return;
    }

    // Определяем, используем ли мы локальную сеть
    const isLocalNetwork = window.location.hostname.startsWith('192.168.') ||
                          window.location.hostname.startsWith('10.') ||
                          window.location.hostname.startsWith('172.');
    
    // Для локальной сети используем localhost (Яндекс не принимает локальные IP)
    const redirectUri = isLocalNetwork
      ? `http://localhost:${window.location.port || 8080}/yandex-token.html`
      : window.location.origin + '/yandex-token.html';
    
    const tokenPageOrigin = isLocalNetwork 
      ? `http://localhost:${window.location.port || 8080}`
      : window.location.origin;
    
    // Логируем redirect_uri для отладки
    console.log('Yandex OAuth redirect_uri:', redirectUri);
    console.log('Current origin:', window.location.origin);
    console.log('⚠️ Убедитесь, что в настройках Яндекс OAuth указан точно такой же redirect_uri:', redirectUri);

    window.YaAuthSuggest.init(
      {
        client_id: yandexClientId,
        response_type: 'token',
        redirect_uri: redirectUri
      },
      tokenPageOrigin
    )
    .then(({ handler }: any) => {
      // Создаем кнопку с официальным логотипом Яндекс
      const publicUrl = process.env.PUBLIC_URL || '';
      const button = document.createElement('button');
      button.className = 'oauth-btn-square yandex';
      button.innerHTML = `
        <div class="oauth-btn-icon">
          <img src="${publicUrl}/images/Yandex_icon.svg" alt="Yandex" />
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
      // Fallback - обычный OAuth redirect с официальной кнопкой
      if (yandexWidgetRef.current) {
        const publicUrl = process.env.PUBLIC_URL || '';
        const button = document.createElement('button');
        button.className = 'oauth-btn-square yandex';
        button.innerHTML = `
          <div class="oauth-btn-icon">
            <img src="${publicUrl}/images/Yandex_icon.svg" alt="Yandex" />
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
    });
  };

  const publicUrl = process.env.PUBLIC_URL || '';

  return (
    <div className="login-container">
      <div 
        className="login-decoration-left"
        style={{
          backgroundImage: `url(${publicUrl}/images/vine-left.svg)`
        }}
      ></div>
      <div 
        className="login-decoration-right"
        style={{
          backgroundImage: `url(${publicUrl}/images/vine-right.svg)`
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
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          {showCodeInput ? (
            <>
              <div className="form-group">
                <label htmlFor="code">Код верификации</label>
                <div className="code-input">
                  <input
                    type="text"
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Последние 4 цифры номера звонящего"
                    maxLength={4}
                  />
                </div>
                <p className="hint">Вам поступит звонок. Последние 4 цифры номера звонящего - это ваш код верификации.</p>
              </div>
              <motion.button 
                className="btn btn-primary" 
                onClick={verifyPhoneCode}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span>Войти</span>
              </motion.button>
            </>
          ) : (
            <motion.button 
              className="btn btn-primary" 
              onClick={sendPhoneCode}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <span>Позвонить</span>
            </motion.button>
          )}
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

