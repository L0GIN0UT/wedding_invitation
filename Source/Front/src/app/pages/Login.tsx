import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Phone, Check, Loader2, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/apiAdapter';

// Типы для VK ID SDK
declare global {
  interface Window {
    VKIDSDK: any;
    YaAuthSuggest: any;
  }
}

// Separate component for floating hearts to prevent re-render
const FloatingHearts: React.FC = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Floating hearts */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      >
        <Heart 
          className="w-8 h-8 md:w-12 md:h-12"
          style={{ color: 'var(--color-lilac-light)' }}
          fill="var(--color-lilac-light)"
        />
      </motion.div>
    ))}

    {/* Gradient orbs */}
    <motion.div
      className="absolute -top-1/4 -right-1/4 w-96 h-96 md:w-[800px] md:h-[800px] lg:w-[1000px] lg:h-[1000px] rounded-full opacity-20"
      style={{ background: 'var(--gradient-main)' }}
      animate={{
        scale: [1, 1.1, 1],
        rotate: [0, 90, 0],
      }}
      transition={{ duration: 20, repeat: Infinity }}
    />
    <motion.div
      className="absolute -bottom-1/4 -left-1/4 w-96 h-96 md:w-[800px] md:h-[800px] lg:w-[1000px] lg:h-[1000px] rounded-full opacity-20"
      style={{ background: 'var(--gradient-main)' }}
      animate={{
        scale: [1.1, 1, 1.1],
        rotate: [90, 0, 90],
      }}
      transition={{ duration: 20, repeat: Infinity }}
    />
  </div>
));
FloatingHearts.displayName = 'FloatingHearts';

const API_URL = window.location.origin + '/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vkClientId, setVkClientId] = useState<string | null>(null);
  const [yandexClientId, setYandexClientId] = useState<string | null>(null);
  const vkWidgetRef = useRef<HTMLDivElement>(null);
  const yandexWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Восстанавливаем состояние из localStorage
    const savedPhone = localStorage.getItem('verification_phone');
    const savedCodeSent = localStorage.getItem('verification_code_sent') === 'true';
    
    if (savedPhone) {
      // Убираем +7 из сохраненного номера для форматирования
      // savedPhone в формате "+79991234567", нужно получить "79991234567"
      const digits = savedPhone.replace(/\D/g, '');
      // Если начинается с 7, оставляем как есть, иначе добавляем 7
      const phoneDigits = digits.startsWith('7') ? digits : '7' + digits;
      setPhone(phoneDigits);
      if (savedCodeSent) {
        setCodeSent(true);
      }
    } else {
      // Инициализируем пустым (будет показано +7 через placeholder)
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

  const formatPhone = (phone: string): string => {
    // Если пусто, возвращаем пустую строку (для показа placeholder)
    if (!phone || phone.length === 0) {
      return '';
    }
    
    // Убираем все нецифровые символы
    const digits = phone.replace(/\D/g, '');
    
    // Если начинается с 8, заменяем на 7
    let cleanDigits = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
    
    // Если не начинается с 7 и есть цифры, добавляем 7
    if (cleanDigits && !cleanDigits.startsWith('7')) {
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setError('');
  };

  const handleSendCode = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Преобразуем отформатированный номер в чистый формат
    // phone хранится как цифры (например "79991234567"), нужно убрать первую 7
    const digits = phone ? phone.replace(/\D/g, '') : '';
    const cleanDigits = digits.startsWith('7') ? digits.slice(1) : digits;
    const cleanPhone = '+7' + cleanDigits;

    try {
      await authAPI.sendCode(cleanPhone);
      setCodeSent(true);
      setSuccess('Код отправлен! Последние 4 цифры номера - это код');
      localStorage.setItem('verification_phone', cleanPhone);
      localStorage.setItem('verification_code_sent', 'true');
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setIsLoading(true);

    // Преобразуем отформатированный номер в чистый формат
    // phone хранится как цифры (например "79991234567"), нужно убрать первую 7
    const digits = phone ? phone.replace(/\D/g, '') : '';
    const cleanDigits = digits.startsWith('7') ? digits.slice(1) : digits;
    const cleanPhone = '+7' + cleanDigits;

    try {
      const result = await authAPI.verifyCode(cleanPhone, code);
      localStorage.removeItem('verification_phone');
      localStorage.removeItem('verification_code_sent');
      login(result.access_token, result.refresh_token);
      setSuccess('Вход выполнен!');
      setTimeout(() => navigate('/event'), 500);
    } catch (err: any) {
      setError(err.message || 'Неверный код');
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
        setError(data.detail || 'Ошибка авторизации');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const initVKID = () => {
    if (!vkWidgetRef.current || !vkClientId) return;

    if (!('VKIDSDK' in window)) {
      console.error('VK ID SDK не загружен');
      return;
    }

    const VKID = window.VKIDSDK;
    const redirectUrl = window.location.origin + '/login';
    
    const isLocalNetwork = window.location.hostname.startsWith('192.168.') ||
                          window.location.hostname.startsWith('10.') ||
                          window.location.hostname.startsWith('172.');
    
    const finalRedirectUrl = isLocalNetwork 
      ? `http://localhost:${window.location.port || 8080}/login`
      : redirectUrl;

    try {
      VKID.Config.init({
        app: parseInt(vkClientId),
        redirectUrl: finalRedirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '',
      });

      const oneTap = new VKID.OneTap();

      oneTap.render({
        container: vkWidgetRef.current,
        showAlternativeLogin: true
      })
      .on(VKID.WidgetEvents.ERROR, (error: any) => {
        console.error('VK ID OneTap Error:', error);
      })
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload: any) => {
        const code = payload.code;
        const deviceId = payload.device_id;

        VKID.Auth.exchangeCode(code, deviceId)
          .then((data: any) => {
            if (data && data.access_token) {
              sendOAuthToken('vk', data.access_token);
            } else {
              setError('Не удалось получить токен VK');
            }
          })
          .catch((error: any) => {
            console.error('VK ID Exchange Error:', error);
            setError('Ошибка обмена кода на токен VK');
          });
      });
    } catch (error) {
      console.error('VK ID Init Error:', error);
      setError('Ошибка инициализации VK ID');
    }
  };

  const initYandexID = () => {
    if (!yandexWidgetRef.current || !yandexClientId) return;

    if (typeof window.YaAuthSuggest === 'undefined') {
      console.error('Yandex ID SDK не загружен');
      return;
    }

    const isLocalNetwork = window.location.hostname.startsWith('192.168.') ||
                          window.location.hostname.startsWith('10.') ||
                          window.location.hostname.startsWith('172.');
    
    const redirectUri = isLocalNetwork
      ? `http://localhost:${window.location.port || 8080}/yandex-token.html`
      : window.location.origin + '/yandex-token.html';
    
    const tokenPageOrigin = isLocalNetwork 
      ? `http://localhost:${window.location.port || 8080}`
      : window.location.origin;

    const oauthQueryParams = {
      client_id: yandexClientId,
      response_type: 'token',
      redirect_uri: redirectUri
    };

    window.YaAuthSuggest.init(
      oauthQueryParams,
      tokenPageOrigin,
      {
        view: "button",
        parentId: yandexWidgetRef.current.id || "yandexButtonContainer",
        buttonSize: 'm',
        buttonView: 'main',
        buttonTheme: 'light',
        buttonBorderRadius: "8",
        buttonIcon: 'ya',
      }
    )
    .then(({ handler }: any) => {
      return handler();
    })
    .then((data: any) => {
      if (data && data.access_token) {
        sendOAuthToken('yandex', data.access_token);
      } else {
        setError('Токен не получен от Яндекс');
      }
    })
    .catch((error: any) => {
      console.error('Yandex Auth Error:', error);
      setError('Ошибка авторизации Яндекс');
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" 
         style={{ background: 'linear-gradient(135deg, #faf8f3 0%, #fefcf8 100%)' }}>
      
      {/* Decorative Background Elements */}
      <FloatingHearts />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 md:p-10">
          {/* Header */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-block mb-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto"
                   style={{ background: 'var(--gradient-main)' }}>
                <Heart className="w-10 h-10 md:w-12 md:h-12 text-white" fill="white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif gradient-text mb-3">
              Иван <span className="decorative-font text-4xl md:text-5xl">&</span> Алина
            </h1>
            <p className="text-base md:text-lg" style={{ color: 'var(--color-text-light)' }}>
              Приглашают вас на нашу свадьбу
            </p>
            <div className="elegant-divider my-6"></div>
            <p className="text-sm" style={{ color: 'var(--color-text-lighter)' }}>
              Пожалуйста, войдите, чтобы подтвердить присутствие
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Номер телефона
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                       style={{ color: 'var(--color-text-lighter)' }} />
                <input
                  type="tel"
                  value={phone ? formatPhone(phone) : ''}
                  onChange={handlePhoneChange}
                  onFocus={(e) => {
                    // При фокусе, если поле пустое, показываем +7
                    if (!phone) {
                      setPhone('7');
                    }
                  }}
                  placeholder="+7 (___) ___-__-__"
                  maxLength={18}
                  disabled={codeSent}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-lilac)]"
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>

            {/* Code Input */}
            {codeSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Код подтверждения
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="____"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-xl border-2 text-center text-2xl tracking-widest transition-all focus:outline-none focus:border-[var(--color-lilac)]"
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </motion.div>
            )}

            {/* Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg text-sm text-center"
                style={{ 
                  backgroundColor: 'rgba(212, 24, 61, 0.1)',
                  color: 'var(--color-destructive)'
                }}
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.1), rgba(144, 198, 149, 0.1))',
                  color: 'var(--color-text)'
                }}
              >
                <Check className="w-4 h-4" style={{ color: 'var(--color-green)' }} />
                {success}
              </motion.div>
            )}

            {/* Action Button */}
            <button
              onClick={codeSent ? handleVerifyCode : handleSendCode}
              disabled={isLoading || (codeSent && code.length !== 4) || (!codeSent && (!phone || phone.replace(/\D/g, '').length < 10))}
              className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'var(--gradient-main)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : codeSent ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Подтвердить код</span>
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  <span>Получить код</span>
                </>
              )}
            </button>

            {codeSent && (
              <button
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full py-2 text-sm transition-colors"
                style={{ color: 'var(--color-text-light)' }}
              >
                Изменить номер
              </button>
            )}

            {/* OAuth Buttons */}
            {!codeSent && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white" style={{ color: 'var(--color-text-lighter)' }}>или войдите через</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div ref={vkWidgetRef} id="vkButtonContainer" className="flex justify-center"></div>
                  <div 
                    ref={yandexWidgetRef} 
                    id="yandexButtonContainer" 
                    className="flex justify-center"
                  >
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Demo Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-4 rounded-lg text-xs text-center"
            style={{
              backgroundColor: 'rgba(184, 162, 200, 0.05)',
              color: 'var(--color-text-lighter)'
            }}
          >
            Вам поступит звонок. Последние 4 цифры номера - это ваш код
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
