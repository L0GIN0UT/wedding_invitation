import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Объявляем sendOAuthToken с useCallback ДО использования в useEffect
  const sendOAuthToken = useCallback(async (provider: 'vk' | 'yandex', accessToken: string) => {
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
        // Немедленный редирект БЕЗ показа страницы логина (используем replace)
        window.location.replace('/event');
      } else {
        setMessage({ text: data.detail || 'Ошибка авторизации', type: 'error' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      setMessage({ text: 'Ошибка соединения с сервером', type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    }
  }, [login]);
  
  // Убрали автоматический редирект - пусть пользователь сам решает, куда идти

  // Обработка OAuth кода ДО рендера компонента - проверяем СРАЗУ
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vkCode = urlParams.get('code');
    const provider = urlParams.get('provider');
    const oauthError = urlParams.get('error'); // Общая ошибка OAuth
    const yandexToken = localStorage.getItem('yandex_oauth_token');
    
    // Обрабатываем ошибки OAuth с понятными сообщениями
    if (oauthError) {
      let errorMessage = 'Ошибка авторизации';
      
      if (oauthError === 'token_exchange_failed') {
        errorMessage = 'Не удалось завершить авторизацию. Пожалуйста, попробуйте еще раз.';
      } else if (oauthError === 'oauth_failed') {
        errorMessage = 'Ошибка при авторизации. Пожалуйста, попробуйте еще раз.';
      } else {
        errorMessage = 'Ошибка авторизации: ' + decodeURIComponent(oauthError);
      }
      
      setTimeout(() => {
        setMessage({ text: errorMessage, type: 'error' });
        setTimeout(() => setMessage(null), 5000);
        window.history.replaceState({}, document.title, '/login');
      }, 100);
      return;
    }
    
    // Если есть код от VK, обрабатываем его сразу и редиректим БЕЗ показа страницы
    if (vkCode && provider === 'vk' && !oauthError) {
      // ВАЖНО: redirect_uri должен точно совпадать с тем, что был при авторизации!
      // При авторизации используется: window.location.origin + '/login?provider=vk'
      const redirectUrl = window.location.origin + '/login?provider=vk';
      
      // Проверяем state для безопасности (CSRF защита)
      const savedState = sessionStorage.getItem('vk_oauth_state');
      const urlState = urlParams.get('state');
      if (savedState && urlState && savedState !== urlState) {
        setMessage({ text: 'Ошибка безопасности при авторизации. Пожалуйста, попробуйте еще раз.', type: 'error' });
        setTimeout(() => setMessage(null), 5000);
        window.history.replaceState({}, document.title, '/login');
        return;
      }
      sessionStorage.removeItem('vk_oauth_state');
      
      // Получаем code_verifier из sessionStorage (для PKCE)
      const codeVerifier = sessionStorage.getItem('vk_code_verifier');
      if (!codeVerifier) {
        // Если code_verifier отсутствует, это критическая ошибка
        setMessage({ text: 'Ошибка безопасности при авторизации. Пожалуйста, попробуйте еще раз.', type: 'error' });
        setTimeout(() => setMessage(null), 5000);
        window.history.replaceState({}, document.title, '/login');
        return;
      }
      sessionStorage.removeItem('vk_code_verifier'); // Удаляем после использования
      
      // Обмениваем код на токен через бэкенд (VK ID с PKCE)
      fetch(`${API_URL}/auth/oauth/exchange-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'vk',
          code: vkCode,
          redirect_uri: redirectUrl,
          code_verifier: codeVerifier // VK ID использует PKCE
        }),
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          // Если ошибка от бэкенда, показываем детали
          throw new Error(data.detail || data.message || 'Ошибка обмена кода на токен');
        }
        return data;
      })
      .then(data => {
        if (data && data.access_token) {
          // Немедленно обмениваем токен на сессию и редиректим
          return fetch(`${API_URL}/auth/oauth/login`, {
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
              // Немедленный редирект БЕЗ показа страницы логина
              window.location.replace('/event');
            } else {
              // Показываем понятное сообщение об ошибке вместо редиректа
              setMessage({ text: 'Ошибка при авторизации. Пожалуйста, попробуйте еще раз.', type: 'error' });
              setTimeout(() => setMessage(null), 5000);
              window.history.replaceState({}, document.title, '/login');
            }
          });
        } else {
          // Показываем понятное сообщение об ошибке вместо редиректа
          setMessage({ text: 'Не удалось завершить авторизацию. Пожалуйста, попробуйте еще раз.', type: 'error' });
          setTimeout(() => setMessage(null), 5000);
          window.history.replaceState({}, document.title, '/login');
        }
      })
      .catch((error) => {
        // Показываем детали ошибки для отладки
        console.error('VK OAuth exchange error:', error);
        const errorMessage = error.message || 'Ошибка при авторизации. Пожалуйста, попробуйте еще раз.';
        setMessage({ text: errorMessage, type: 'error' });
        setTimeout(() => setMessage(null), 5000);
        window.history.replaceState({}, document.title, '/login');
      });
      return; // Не продолжаем инициализацию компонента
    }
    
    // Если есть токен от Яндекс, обрабатываем его сразу
    if (yandexToken) {
      sendOAuthToken('yandex', yandexToken);
      localStorage.removeItem('yandex_oauth_token');
      localStorage.removeItem('yandex_oauth_token_type');
      localStorage.removeItem('yandex_oauth_expires_in');
      localStorage.removeItem('yandex_oauth_scope');
      // Редирект произойдет после успешного login в sendOAuthToken
      return;
    }
    
    // Обработка ошибок VK уже сделана выше в общем блоке обработки ошибок
  }, [login, sendOAuthToken]); // Добавили зависимости

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

    // Обработка токенов из localStorage (убрали, так как теперь это делается в первом useEffect)

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

  // Создаем кнопки сразу при монтировании компонента (не ждем конфигурацию)
  useEffect(() => {
    // Создаем кнопку VK сразу, даже без clientId (он будет использован при клике)
    if (vkWidgetRef.current && !vkWidgetRef.current.querySelector('button')) {
      const button = document.createElement('button');
      button.className = 'oauth-btn-square vk';
      button.innerHTML = `
        <div class="oauth-btn-icon">
          <img src="/images/VK_icon.svg" alt="VK" />
        </div>
      `;
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.cursor = 'wait';
      vkWidgetRef.current.appendChild(button);
    }
    
    // Создаем кнопку Яндекс сразу, даже без clientId
    if (yandexWidgetRef.current && !yandexWidgetRef.current.querySelector('button')) {
      const button = document.createElement('button');
      button.className = 'oauth-btn-square yandex';
      button.innerHTML = `
        <div class="oauth-btn-icon">
          <img src="/images/Yandex_icon.svg" alt="Yandex" />
        </div>
      `;
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.cursor = 'wait';
      yandexWidgetRef.current.appendChild(button);
    }
  }, []); // Выполняем только при монтировании

  useEffect(() => {
    // Инициализация OAuth после загрузки конфигурации
    // VK используем VK ID с PKCE, Яндекс - SDK
    if (vkClientId && vkWidgetRef.current) {
      initVKID();
    }
    if (yandexClientId && yandexWidgetRef.current) {
      initYandexID();
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
    
    // Форматируем: +7 (XXX) XXX-XX-XX
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
      return `+7 (${cleanDigits.slice(1, 4)}) ${cleanDigits.slice(4, 7)}-${cleanDigits.slice(7)}`;
    }
    
    return `+7 (${cleanDigits.slice(1, 4)}) ${cleanDigits.slice(4, 7)}-${cleanDigits.slice(7, 9)}-${cleanDigits.slice(9, 11)}`;
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

    // Находим существующую кнопку или создаем новую
    let button = vkWidgetRef.current.querySelector('button') as HTMLButtonElement;
    if (!button) {
      button = document.createElement('button');
          button.className = 'oauth-btn-square vk';
          button.innerHTML = `
            <div class="oauth-btn-icon">
          <img src="/images/VK_icon.svg" alt="VK" />
            </div>
          `;
          vkWidgetRef.current.innerHTML = '';
          vkWidgetRef.current.appendChild(button);
        }
    
    // Активируем кнопку
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    
    button.onclick = () => {
      // Используем VK ID (OAuth 2.1) с PKCE согласно документации
      // https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/start-integration/auth-without-sdk/auth-without-sdk-web
      const redirectUrl = encodeURIComponent(window.location.origin + '/login?provider=vk');
      
      // Генерируем state (минимум 32 символа, a-z, A-Z, 0-9, _, -)
      // Согласно документации VK ID: https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/start-integration/auth-without-sdk/auth-without-sdk-web
      const stateArray = new Uint8Array(32);
      crypto.getRandomValues(stateArray);
      // Преобразуем в base64url-safe строку (минимум 32 символа)
      const state = btoa(String.fromCharCode.apply(null, Array.from(stateArray)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .substring(0, 43); // base64 дает 43 символа для 32 байт
      sessionStorage.setItem('vk_oauth_state', state);
      
      // Генерируем PKCE параметры
      generatePKCE().then(({ codeChallenge }) => {
        // Используем правильный VK ID endpoint согласно документации
        // Endpoint: https://id.vk.ru/authorize
        const authUrl = `https://id.vk.ru/authorize?response_type=code&client_id=${vkClientId}&redirect_uri=${redirectUrl}&scope=phone+email&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}&display=page`;
        window.location.href = authUrl;
      }).catch(error => {
        console.error('Ошибка генерации PKCE:', error);
        showMessage('Ошибка инициализации VK авторизации', 'error');
      });
    };
  };

  const initYandexID = () => {
    if (!yandexWidgetRef.current || !yandexClientId) return;

    const redirectUri = window.location.origin + '/yandex-token.html';
    
    // Находим существующую кнопку или создаем новую
    let button = yandexWidgetRef.current.querySelector('button') as HTMLButtonElement;
    if (!button) {
      button = document.createElement('button');
      button.className = 'oauth-btn-square yandex';
      button.innerHTML = `
        <div class="oauth-btn-icon">
          <img src="/images/Yandex_icon.svg" alt="Yandex" />
        </div>
      `;
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

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;

