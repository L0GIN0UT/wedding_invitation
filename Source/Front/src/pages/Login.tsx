import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [vkClientId, setVkClientId] = useState<string | null>(null);
  const [yandexClientId, setYandexClientId] = useState<string | null>(null);
  const vkWidgetRef = useRef<HTMLDivElement>(null);
  const yandexWidgetRef = useRef<HTMLDivElement>(null);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Если пользователь уже авторизован, редиректим на главную
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/event', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Обработка OAuth кода ДО рендера компонента
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vkCode = urlParams.get('code');
    const provider = urlParams.get('provider');
    const vkError = urlParams.get('error');
    
      // Если есть код от VK, обрабатываем его сразу и редиректим
      if (vkCode && !vkError) {
        // Получаем code_verifier из sessionStorage (для PKCE)
        const codeVerifier = sessionStorage.getItem('vk_code_verifier');
        sessionStorage.removeItem('vk_code_verifier'); // Удаляем после использования
        
        // Загружаем конфигурацию для получения vkClientId
        fetch(`${API_URL}/config`)
          .then(res => res.json())
          .then(config => {
            const redirectUrl = window.location.origin + '/login';
            // Обмениваем код на токен через бэкенд (с PKCE если есть)
            return fetch(`${API_URL}/auth/oauth/exchange-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'vk',
                code: vkCode,
                redirect_uri: redirectUrl,
                code_verifier: codeVerifier // Передаем code_verifier для PKCE
              }),
            });
          })
        .then(res => res.json())
        .then(data => {
          if (data && data.access_token) {
            // Немедленно обмениваем токен на сессию и редиректим
            fetch(`${API_URL}/auth/oauth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'vk',
                access_token: data.access_token,
              }),
            })
            .then(res => res.json())
            .then(loginData => {
              if (loginData && loginData.access_token && loginData.refresh_token) {
                login(loginData.access_token, loginData.refresh_token);
                // Немедленный редирект без показа страницы логина
                window.location.href = '/event';
              } else {
                window.location.href = '/login?error=oauth_failed';
              }
            })
            .catch(() => {
              window.location.href = '/login?error=oauth_failed';
            });
          } else {
            window.location.href = '/login?error=token_exchange_failed';
          }
        })
        .catch(() => {
          window.location.href = '/login?error=oauth_failed';
        });
      return; // Не продолжаем инициализацию компонента
    }
    
    // Если есть ошибка, показываем её после загрузки компонента
    if (vkError) {
      setTimeout(() => {
        showMessage('Ошибка авторизации: ' + decodeURIComponent(vkError), 'error');
        window.history.replaceState({}, document.title, '/login');
      }, 100);
    }
  }, []); // Выполняем только один раз при монтировании

  useEffect(() => {
    // Восстанавливаем состояние из localStorage
    const savedPhone = localStorage.getItem('verification_phone');
    const savedCodeSent = localStorage.getItem('verification_code_sent') === 'true';
    
    if (savedPhone) {
      // Убираем +7 из сохраненного номера для форматирования
      const digits = savedPhone.replace(/\D/g, '').slice(1);
      setPhone(digits);
      if (savedCodeSent) {
        setCodeSent(true);
      }
    } else {
      // Инициализируем пустым (будет показано +7)
      setPhone('');
    }

    // Загружаем конфигурацию
    fetch(`${API_URL}/config`)
      .then(res => res.json())
      .then(config => {
        setVkClientId(config.vk_client_id);
        setYandexClientId(config.yandex_client_id);
      })
      .catch(err => console.error('Ошибка загрузки конфигурации:', err));

    // Загружаем только Яндекс SDK (VK используем прямой OAuth redirect)
    const yandexScript = document.createElement('script');
    yandexScript.src = 'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js';
    yandexScript.async = true;
    document.head.appendChild(yandexScript);

    // Обработка токенов из localStorage
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
    // Инициализация OAuth после загрузки конфигурации
    // VK используем прямой redirect, Яндекс - SDK
    if (vkClientId && vkWidgetRef.current) {
      initVKID();
    }
    if (yandexClientId && yandexWidgetRef.current) {
      setTimeout(() => initYandexID(), 500);
    }
  }, [vkClientId, yandexClientId]);

  const formatPhone = (phone: string): string => {
    // Убираем все нецифровые символы
    const digits = phone.replace(/\D/g, '');
    
    // Если пусто, возвращаем +7
    if (digits.length === 0) {
      return '+7';
    }
    
    // Если начинается с 8, заменяем на 7
    let cleanDigits = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
    
    // Если не начинается с 7, добавляем 7
    if (!cleanDigits.startsWith('7')) {
      cleanDigits = '7' + cleanDigits;
    }
    
    // Ограничиваем до 11 цифр (7XXXXXXXXXX)
    cleanDigits = cleanDigits.slice(0, 11);
    
    // Форматируем: +7 (XXX) XXX XX XX
    if (cleanDigits.length <= 1) {
      return `+7`;
    }
    
    if (cleanDigits.length <= 4) {
      return `+7 (${cleanDigits.slice(1)}`;
    }
    
    if (cleanDigits.length <= 7) {
      return `+7 (${cleanDigits.slice(1, 4)}) ${cleanDigits.slice(4)}`;
    }
    
    if (cleanDigits.length <= 9) {
      return `+7 (${cleanDigits.slice(1, 4)}) ${cleanDigits.slice(4, 7)} ${cleanDigits.slice(7)}`;
    }
    
    return `+7 (${cleanDigits.slice(1, 4)}) ${cleanDigits.slice(4, 7)} ${cleanDigits.slice(7, 9)} ${cleanDigits.slice(9, 11)}`;
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const sendPhoneCode = async () => {
    // Преобразуем отформатированный номер в чистый формат
    const digits = phone.replace(/\D/g, '');
    
    // Проверяем что есть хотя бы 10 цифр (7 + 10 цифр номера)
    if (!digits || digits.length < 11) {
      showMessage('Введите полный номер телефона', 'error');
      return;
    }
    
    // Формируем номер в формате +7XXXXXXXXXX
    const cleanPhone = '+7' + digits.slice(1);

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Вам поступит звонок. Последние 4 цифры номера звонящего - это ваш код.', 'success');
        setCodeSent(true);
        // Сохраняем в localStorage (чистый формат)
        localStorage.setItem('verification_phone', cleanPhone);
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

    // Преобразуем отформатированный номер в чистый формат
    const digits = phone.replace(/\D/g, '');
    const cleanPhone = '+7' + digits.slice(1);

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code }),
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        // Очищаем localStorage после успешного входа
        localStorage.removeItem('verification_phone');
        localStorage.removeItem('verification_code_sent');
        login(data.access_token, data.refresh_token);
        // Немедленный редирект без показа страницы логина
        window.location.href = '/event';
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
        // Немедленный редирект без показа страницы логина
        window.location.href = '/event';
      } else {
        showMessage(data.detail || 'Ошибка авторизации', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    }
  };

  // Генерация PKCE параметров для VK ID
  const generatePKCE = () => {
    // Генерируем code_verifier (43-128 символов, URL-safe)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Генерируем code_challenge (SHA256 hash от code_verifier)
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
      .then(hash => {
        const hashArray = new Uint8Array(hash);
        const codeChallenge = btoa(String.fromCharCode.apply(null, Array.from(hashArray)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
        // Сохраняем code_verifier в sessionStorage для последующего использования
        sessionStorage.setItem('vk_code_verifier', codeVerifier);
        
        return { codeVerifier, codeChallenge };
      });
  };

  const initVKID = () => {
    if (!vkWidgetRef.current || !vkClientId) return;

    // Создаем кнопку с прямой OAuth авторизацией (без SDK из-за CORS)
    const button = document.createElement('button');
    button.className = 'oauth-btn-square vk';
    button.innerHTML = `
      <div class="oauth-btn-icon">
        <img src="/images/VK_icon.svg" alt="VK" />
      </div>
    `;
    button.onclick = () => {
      // Для VK ID (OAuth 2.1) используем правильный endpoint с PKCE
      const redirectUrl = encodeURIComponent(window.location.origin + '/login?provider=vk');
      
      // Генерируем PKCE параметры
      generatePKCE().then(({ codeChallenge }) => {
        // Используем VK ID endpoint (OAuth 2.1)
        const authUrl = `https://id.vk.ru/oauth2/authorize?client_id=${vkClientId}&redirect_uri=${redirectUrl}&scope=phone,email&response_type=code&display=page&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        window.location.href = authUrl;
      }).catch(error => {
        console.error('Ошибка генерации PKCE:', error);
        showMessage('Ошибка инициализации VK авторизации', 'error');
      });
    };
    vkWidgetRef.current.innerHTML = '';
    vkWidgetRef.current.appendChild(button);
  };

  const initYandexID = () => {
    if (!yandexWidgetRef.current || !yandexClientId) return;

    const redirectUri = window.location.origin + '/yandex-token.html';
    
    // Создаем кнопку сразу (не ждем SDK)
    const button = document.createElement('button');
    button.className = 'oauth-btn-square yandex';
    button.innerHTML = `
      <div class="oauth-btn-icon">
        <img src="/images/Yandex_icon.svg" alt="Yandex" />
      </div>
    `;
    
    // Временно отключаем кнопку до загрузки SDK
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'wait';
    
    // Добавляем кнопку сразу
    if (yandexWidgetRef.current) {
      yandexWidgetRef.current.innerHTML = '';
      yandexWidgetRef.current.appendChild(button);
    }
    
    // Проверяем загрузку SDK
    const checkSDK = () => {
      if (typeof window.YaAuthSuggest === 'undefined') {
        setTimeout(checkSDK, 100);
        return;
      }

      // SDK загружен, активируем кнопку
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      
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
        })
        .catch((error: any) => {
          console.error('Yandex ID Init Error:', error);
          // Fallback - обычный OAuth redirect
          button.onclick = () => {
            const redirectUriEncoded = encodeURIComponent(redirectUri);
            const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${yandexClientId}&redirect_uri=${redirectUriEncoded}`;
            window.location.href = authUrl;
          };
          button.disabled = false;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
        });
      } catch (error) {
        console.error('Yandex ID Init Error:', error);
        // Fallback - обычный OAuth redirect
        button.onclick = () => {
          const redirectUriEncoded = encodeURIComponent(redirectUri);
          const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${yandexClientId}&redirect_uri=${redirectUriEncoded}`;
          window.location.href = authUrl;
        };
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
      }
    };

    // Запускаем проверку SDK
    checkSDK();
  };

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
                value={phone ? formatPhone(phone) : ''}
                onChange={(e) => {
                  // Получаем введенное значение и убираем все нецифровые символы
                  let digits = e.target.value.replace(/\D/g, '');
                  
                  // Если начинается с 8, заменяем на 7
                  if (digits.startsWith('8')) {
                    digits = '7' + digits.slice(1);
                  }
                  
                  // Если не начинается с 7 и есть цифры, добавляем 7
                  if (digits && !digits.startsWith('7')) {
                    digits = '7' + digits;
                  }
                  
                  // Ограничиваем длину (максимум 11 цифр: 7XXXXXXXXXX)
                  digits = digits.slice(0, 11);
                  
                  // Сохраняем только цифры (без +7)
                  setPhone(digits);
                }}
                onFocus={(e) => {
                  // При фокусе, если поле пустое, показываем +7
                  if (!phone) {
                    setPhone('7');
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

