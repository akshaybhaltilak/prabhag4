import React, { useState, useEffect } from 'react';
import { FiPrinter, FiBluetooth, FiShare2, FiMessageCircle, FiX, FiPhone } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { db } from '../Firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useCandidate } from '../Context/CandidateContext';
import { FiUser } from 'react-icons/fi';

// Global Bluetooth connection state
let globalBluetoothConnection = {
  device: null,
  characteristic: null,
  connected: false
};

// Cache for translated text to avoid repeated API calls
const translationCache = new Map();

const BluetoothPrinter = ({ voter, familyMembers }) => {
  const [importingContact, setImportingContact] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(globalBluetoothConnection.connected);
  const [printerDevice, setPrinterDevice] = useState(globalBluetoothConnection.device);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(globalBluetoothConnection.characteristic);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isFamily, setIsFamily] = useState(false);
  const [voterData, setVoterData] = useState(null);
  const [actionType, setActionType] = useState('');

  const { candidateInfo } = useCandidate();

   // Website URL - update this with your actual domain
  const WEBSITE_URL = "https://prabhag4-bjp.vercel.app/";
  // Image URL for the receipt
  const RECEIPT_IMAGE_URL = "https://www.shutterstock.com/image-vector/rajkot-gujarat-india-10-disember-600nw-2400847277.jpg";

  // Check if mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    setBluetoothConnected(globalBluetoothConnection.connected);
    setPrinterDevice(globalBluetoothConnection.device);
    setPrinterCharacteristic(globalBluetoothConnection.characteristic);

    if (voter) {
      loadVoterData();
    }

    window.printVoter = () => printViaBluetooth(false);
    window.printFamily = () => printViaBluetooth(true);
    window.handleWhatsAppShare = handleWhatsAppShare;

    prefetchSitePreview();
  }, [voter]);

  const prefetchSitePreview = async () => {
    try {
      const img = new Image();
      img.src = WEBSITE_URL;
      img.style.display = 'none';
      document.body.appendChild(img);
      setTimeout(() => {
        try { document.body.removeChild(img); } catch (e) { }
      }, 3000);
    } catch (e) { }
  };

  const handleContactImport = async (type = 'whatsapp') => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert('संपर्क आयात आपल्या ब्राउझरमध्ये समर्थित नाही. कृपया नंबर मॅन्युअली टाका.');
      return;
    }

    setImportingContact(true);

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        const selectedContact = contacts[0];
        const phoneNumbers = selectedContact.tel || [];
        const validPhoneNumber = phoneNumbers.find(num => num && num.trim().length > 0);

        if (validPhoneNumber) {
          const cleanedNumber = validPhoneNumber.replace(/\D/g, '');
          let finalNumber = cleanedNumber;

          if (cleanedNumber.startsWith('91') && cleanedNumber.length === 12) {
            finalNumber = cleanedNumber.substring(2);
          } else if (cleanedNumber.startsWith('+91') && cleanedNumber.length === 13) {
            finalNumber = cleanedNumber.substring(3);
          }

          if (finalNumber.length === 10) {
            setWhatsappNumber(finalNumber);
          } else {
            alert(`अमान्य फोन नंबर लांबी: ${finalNumber.length} अंक. कृपया 10-अंकी भारतीय नंबर टाका.`);
          }
        } else {
          alert('निवडलेल्या संपर्कात कोणताही वैध फोन नंबर नाही.');
        }
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);

      if (error.name === 'AbortError') {
        console.log('User canceled contact selection.');
      } else if (error.name === 'NotAllowedError') {
        alert('संपर्कांमध्ये प्रवेश करण्याची परवानगी नाकारण्यात आली. कृपया नंबर मॅन्युअली टाका.');
      } else if (error.name === 'SecurityError') {
        alert('संपर्क पिकरसाठी सुरक्षित (HTTPS) कनेक्शन आवश्यक आहे.');
      } else {
        alert('संपर्कांमध्ये प्रवेश करण्यात अयशस्वी. कृपया नंबर मॅन्युअली टाका.');
      }
    } finally {
      setImportingContact(false);
    }
  };

  const loadVoterData = async () => {
    try {
      const docId = voter?.id || voter?.voterId;
      if (!docId) {
        setVoterData(voter);
        return;
      }

      const localVoterData = localStorage.getItem(`voter_${docId}`);
      let merged = { ...(voter || {}) };

      if (localVoterData) {
        try {
          const parsedData = JSON.parse(localVoterData);
          merged = { ...merged, ...parsedData };
        } catch (e) {
          console.warn('local parse error', e);
        }
      } else {
        const voterDocRef = doc(db, 'voters', String(docId));
        const voterDoc = await getDoc(voterDocRef);
        if (voterDoc.exists()) {
          const data = voterDoc.data();
          merged = { ...merged, ...data };
          localStorage.setItem(`voter_${docId}`, JSON.stringify(data));
        }
      }

      try {
        const vsRef = doc(db, 'voter_surveys', String(docId));
        const vsSnap = await getDoc(vsRef);
        if (vsSnap.exists()) {
          const vsData = vsSnap.data() || {};
          if (vsData.whatsapp) merged.whatsapp = String(vsData.whatsapp).replace(/\D/g, '');
        }
      } catch (e) {
        console.warn('voter_surveys fetch failed', e);
      }

      localStorage.setItem(`voter_${docId}`, JSON.stringify(merged));
      setVoterData(merged);
    } catch (error) {
      console.error('Error loading voter data:', error);
      setVoterData(voter);
    }
  };

  const saveWhatsappNumber = async (number) => {
    try {
      const docId = voter?.id || voter?.voterId;
      if (!docId) throw new Error('Voter ID not available');

      const cleaned = String(number).replace(/\D/g, '');
      const updateData = { whatsapp: cleaned };

      const vsDocRef = doc(db, 'voter_surveys', String(docId));
      await setDoc(vsDocRef, updateData, { merge: true });

      const localVoterDataRaw = localStorage.getItem(`voter_${docId}`);
      let localVoterData = {};
      if (localVoterDataRaw) {
        try { localVoterData = JSON.parse(localVoterDataRaw); } catch (e) { localVoterData = {}; }
      }
      const newLocal = { ...localVoterData, ...updateData };
      localStorage.setItem(`voter_${docId}`, JSON.stringify(newLocal));

      setVoterData(prev => ({ ...prev, ...updateData }));

      return true;
    } catch (error) {
      console.error('Error saving whatsapp number:', error);
      return false;
    }
  };

  const getWhatsappNumber = () => {
    if (!voterData) return '';

    if (voterData.whatsapp) {
      const num = String(voterData.whatsapp).replace(/\D/g, '');
      if (num.length === 10) return num;
    }

    if (voter?.whatsapp) {
      const num = String(voter.whatsapp).replace(/\D/g, '');
      if (num.length === 10) return num;
    }

    return '';
  };

  const hasWhatsappNumber = () => {
    const number = getWhatsappNumber();
    return number && number.length === 10;
  };

  const validatePhoneNumber = (number) => {
    const cleaned = String(number || '').replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const safeString = (v) => {
    if (v === null || v === undefined) return '';
    // Keep all visible characters including numbers
    return String(v).replace(/\u200C/g, '').replace(/\u200B/g, '').trim();
  };

  const generateWhatsAppMessage = (isFamily = false) => {
    if (!voterData) return '';

    let message = `*${safeString(candidateInfo.party)}*\n`;
    message += `*${safeString(candidateInfo.name)}*\n\n`;

    if (isFamily && Array.isArray(familyMembers) && familyMembers.length > 0) {
      message += `*कुटुंब तपशील*\n\n`;
      message += `*1) ${safeString(voterData.name)}*\n`;
      message += `अनुक्रमांक: ${safeString(voterData.serialNumber || 'N/A')}\n`;
      message += `मतदार आयडी: ${safeString(voterData.voterId || 'N/A')}\n`;
      message += `बूथ क्र.: ${safeString(voterData.boothNumber || 'N/A')}\n`;
      message += `लिंग: ${safeString(voterData.gender || 'N/A')}\n`;
      message += `वय: ${safeString(voterData.age || 'N/A')}\n`;
      message += `मतदान केंद्र: ${safeString(voterData.pollingStationAddress || 'N/A')}\n\n`;

      familyMembers.forEach((member, index) => {
        message += `*${index + 2}) ${safeString(member.name)}*\n`;
        message += `अनुक्रमांक: ${safeString(member.serialNumber || 'N/A')}\n`;
        message += `मतदार आयडी: ${safeString(member.voterId || 'N/A')}\n`;
        message += `बूथ क्र.: ${safeString(member.boothNumber || 'N/A')}\n`;
        message += `लिंग: ${safeString(member.gender || 'N/A')}\n`;
        message += `वय: ${safeString(member.age || 'N/A')}\n`;
        message += `मतदान केंद्र: ${safeString(member.pollingStationAddress || 'N/A')}\n\n`;
      });
    } else {
      message += `*मतदार तपशील*\n\n`;
      message += `*नाव:* ${safeString(voterData.name)}\n`;
      message += `*मतदार आयडी:* ${safeString(voterData.voterId || 'N/A')}\n`;
      message += `*अनुक्रमांक:* ${safeString(voterData.serialNumber || 'N/A')}\n`;
      message += `*बूथ क्र.:* ${safeString(voterData.boothNumber || 'N/A')}\n`;
      message += `*लिंग:* ${safeString(voterData.gender || 'N/A')}\n`;
      message += `*वय:* ${safeString(voterData.age || 'N/A')}\n`;
      message += `*मतदान केंद्र:* ${safeString(voterData.pollingStationAddress || 'N/A')}\n\n`;
    }

    message += `${safeString(candidateInfo.messageWhatsapp)}`
    message += `\n${WEBSITE_URL}`;

    return message;
  };

  const handleWhatsAppShare = async (isFamilyShare = false) => {
    if (!voterData) return;

    setIsFamily(isFamilyShare);
    setActionType('whatsapp');

    const whatsappNum = getWhatsappNumber();

    if (whatsappNum) {
      const message = generateWhatsAppMessage(isFamilyShare);
      const url = `https://wa.me/91${whatsappNum}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      setWhatsappNumber('');
      setShowWhatsAppModal(true);
    }
  };

  const handleCall = async () => {
    if (!voterData) return;

    setActionType('call');

    const whatsappNum = getWhatsappNumber();

    if (whatsappNum) {
      window.open(`tel:${whatsappNum}`, '_blank');
    } else {
      setWhatsappNumber('');
      setShowCallModal(true);
    }
  };

  const confirmWhatsAppShare = async () => {
    if (!validatePhoneNumber(whatsappNumber)) {
      alert('कृपया वैध 10-अंकी व्हॉट्सअॅप क्रमांक प्रविष्ट करा');
      return;
    }

    const cleanedNumber = whatsappNumber.replace(/\D/g, '');
    const saved = await saveWhatsappNumber(cleanedNumber);

    if (saved) {
      const message = generateWhatsAppMessage(isFamily);
      const url = `https://wa.me/91${cleanedNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setShowWhatsAppModal(false);
      setWhatsappNumber('');
    } else {
      alert('व्हॉट्सअॅप क्रमांक जतन करण्यात त्रुटी आली');
    }
  };

  const confirmCall = async () => {
    if (!validatePhoneNumber(whatsappNumber)) {
      alert('कृपया वैध 10-अंकी व्हॉट्सअॅप क्रमांक प्रविष्ट करा');
      return;
    }

    const cleanedNumber = whatsappNumber.replace(/\D/g, '');
    const saved = await saveWhatsappNumber(cleanedNumber);

    if (saved) {
      window.open(`tel:${cleanedNumber}`, '_blank');
      setShowCallModal(false);
      setWhatsappNumber('');
    } else {
      alert('क्रमांक जतन करण्यात त्रुटी आली');
    }
  };

  const ContactModal = ({
    isOpen,
    onClose,
    title,
    number,
    setNumber,
    onConfirm,
    type = 'whatsapp'
  }) => {
    if (!isOpen) return null;

    const isCall = type === 'call';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md mx-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isCall ? 'कॉल करण्यासाठी क्रमांक' : 'व्हॉट्सअॅप क्रमांक'}
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder="10-अंकी व्हॉट्सअॅप क्रमांक"
                  value={number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setNumber(value);
                    }
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength="10"
                  autoFocus
                />

                {('contacts' in navigator && 'ContactsManager' in window) && (
                  <button
                    type="button"
                    onClick={() => handleContactImport(type)}
                    disabled={importingContact}
                    className="px-4 py-3 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    title="संपर्कांमधून आयात करा"
                  >
                    {importingContact ? (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FiUser className="text-lg" />
                        <span className="hidden sm:inline text-sm font-medium">आयात</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                हा क्रमांक <strong>voter_surveys</strong> मध्ये जतन केला जाईल
              </p>

              {!('contacts' in navigator && 'ContactsManager' in window) && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  <strong>नोंद:</strong> संपर्क आयात Chrome/Edge ब्राउझरमध्ये HTTPS कनेक्शनवर उपलब्ध आहे.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                रद्द करा
              </button>
              <button
                onClick={onConfirm}
                disabled={!validatePhoneNumber(number)}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${validatePhoneNumber(number)
                  ? isCall
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-400 cursor-not-allowed'
                  }`}
              >
                {isCall ? 'कॉल करा' : 'व्हॉट्सअॅप वर पाठवा'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🔸 MOBILE OPTIMIZED: Bluetooth connection for mobile
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.');
      return null;
    }

    try {
      setPrinting(true);

      // Mobile-specific timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bluetooth connection timeout')), 30000)
      );

      const connectPromise = (async () => {
        console.log('Requesting Bluetooth device...');
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: 'RPD' }],
          optionalServices: [
            '0000ffe0-0000-1000-8000-00805f9b34fb',
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000ff00-0000-1000-8000-00805f9b34fb'
          ]
        });

        device.addEventListener?.('gattserverdisconnected', () => {
          console.log('Bluetooth device disconnected');
          globalBluetoothConnection.connected = false;
          setBluetoothConnected(false);
          setPrinterDevice(null);
          setPrinterCharacteristic(null);
        });

        console.log('Connecting to GATT server...');
        const server = await device.gatt.connect();

        // Try common services for mobile printers
        const servicesToTry = [
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ];

        for (const serviceUuid of servicesToTry) {
          try {
            const service = await server.getPrimaryService(serviceUuid);
            const characteristics = await service.getCharacteristics();

            for (const c of characteristics) {
              if (c.properties && (c.properties.write || c.properties.writeWithoutResponse)) {
                globalBluetoothConnection.device = device;
                globalBluetoothConnection.characteristic = c;
                globalBluetoothConnection.connected = true;

                setPrinterDevice(device);
                setPrinterCharacteristic(c);
                setBluetoothConnected(true);
                setPrinting(false);

                console.log('Bluetooth printer connected successfully on service:', serviceUuid);
                return { device, characteristic: c };
              }
            }
          } catch (e) {
            console.log(`Service ${serviceUuid} not found, trying next...`);
          }
        }

        // Fallback: Get all services
        const services = await server.getPrimaryServices();
        let foundChar = null;

        for (const service of services) {
          try {
            const characteristics = await service.getCharacteristics();
            for (const c of characteristics) {
              if (c.properties && (c.properties.write || c.properties.writeWithoutResponse)) {
                foundChar = c;
                break;
              }
            }
            if (foundChar) break;
          } catch (err) {
            console.warn('Could not read characteristics for service', service.uuid, err);
          }
        }

        if (!foundChar) {
          try { server.disconnect?.(); } catch (e) { /* ignore */ }
          alert('Connected to printer but no writable characteristic found. Try enabling BLE mode on your printer.');
          return null;
        }

        globalBluetoothConnection.device = device;
        globalBluetoothConnection.characteristic = foundChar;
        globalBluetoothConnection.connected = true;

        setPrinterDevice(device);
        setPrinterCharacteristic(foundChar);
        setBluetoothConnected(true);
        setPrinting(false);

        console.log('Bluetooth printer connected', device.name || device.id, foundChar.uuid);
        return { device, characteristic: foundChar };
      })();

      return await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      setPrinting(false);
      setBluetoothConnected(false);

      if (error?.name === 'NotFoundError') {
        alert('No Bluetooth printer found. Make sure:\n1. Printer is ON\n2. Bluetooth is enabled\n3. Printer is in pairing mode\n4. You are close to the printer');
      } else if (error?.name === 'SecurityError') {
        alert('Bluetooth permission denied. Please allow Bluetooth access in browser settings.');
      } else if (error?.message === 'Bluetooth connection timeout') {
        alert('Bluetooth connection timed out. Please try again.');
      } else {
        alert(`Bluetooth connection failed: ${error?.message || error}`);
      }
      return null;
    }
  };

  // 🔸 MOBILE OPTIMIZED: Fixed canvasToEscPosRaster for mobile
  const canvasToEscPosRaster = (canvas) => {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const width = canvas.width;
      const height = canvas.height;
      const widthBytes = Math.ceil(width / 8);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const rasterData = new Uint8Array(widthBytes * height);

      // Initialize with zeros
      for (let i = 0; i < rasterData.length; i++) {
        rasterData[i] = 0;
      }

      // Mobile optimized processing - simpler loop for better performance
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];

          // Calculate grayscale (mobile optimized)
          const gray = (r + g + b) / 3;

          // Convert to black and white with threshold optimized for thermal printing
          const isBlack = gray < 140; // Lower threshold for mobile

          if (isBlack) {
            const byteIndex = Math.floor(x / 8) + y * widthBytes;
            const bitIndex = 7 - (x % 8);
            rasterData[byteIndex] |= (1 << bitIndex);
          }
        }
      }

      const xL = widthBytes & 0xFF;
      const xH = (widthBytes >> 8) & 0xFF;
      const yL = height & 0xFF;
      const yH = (height >> 8) & 0xFF;

      const command = new Uint8Array(8 + rasterData.length);
      command[0] = 0x1D; // GS
      command[1] = 0x76; // v
      command[2] = 0x30; // m
      command[3] = 0x00; // xL
      command[4] = xL;   // xL
      command[5] = xH;   // xH
      command[6] = yL;   // yL
      command[7] = yH;   // yH

      command.set(rasterData, 8);

      return command;
    } catch (error) {
      console.error('Error in canvasToEscPosRaster:', error);
      throw error;
    }
  };

  const ensureDevanagariFont = () => {
    if (document.getElementById('noto-devanagari-font')) return;
    const link = document.createElement('link');
    link.id = 'noto-devanagari-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Roboto:wght@400;700&display=swap';
    document.head.appendChild(link);
  };

  const translateToMarathi = async (text) => {
    if (!text) return '';

    if (/[0-9]/.test(text)) {
      return text;
    }

    const cacheKey = `mr_${text}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    try {
      if (text.length < 3 || /[\u0900-\u097F]/.test(text)) {
        translationCache.set(cacheKey, text);
        return text;
      }

      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await res.json();
      const translated = data?.[0]?.[0]?.[0] || text;

      translationCache.set(cacheKey, translated);
      return translated;
    } catch (e) {
      console.warn('Translation failed:', e);
      translationCache.set(cacheKey, text);
      return text;
    }
  };

  // 🔸 MOBILE OPTIMIZED: printViaBluetooth
  const printViaBluetooth = async (isFamily = false) => {
    if (!voter) {
      alert('No voter data available');
      return;
    }

    if (isFamily && familyMembers.length === 0) {
      alert('No family members to print');
      return;
    }

    try {
      setPrinting(true);

      let connection;
      if (
        globalBluetoothConnection.connected &&
        globalBluetoothConnection.device?.gatt?.connected
      ) {
        connection = {
          device: globalBluetoothConnection.device,
          characteristic: globalBluetoothConnection.characteristic,
        };
      } else {
        connection = await connectBluetooth();
      }

      if (!connection?.characteristic) {
        setPrinting(false);
        return;
      }

      const translatedVoter = {
        name: await translateToMarathi(safeString(voter.name || '')),
        voterId: voter.voterId || '',
        serialNumber: voter.serialNumber ?? '',
        boothNumber: voter.boothNumber ?? '',
        pollingStationAddress: voter.pollingStationAddress || '',
        gender: await translateToMarathi(safeString(voter.gender || '')),
        age: voter.age ?? '',
      };

      const translatedFamily = isFamily && familyMembers.length > 0
        ? await Promise.all(
          familyMembers.map(async (member) => ({
            ...member,
            name: await translateToMarathi(safeString(member.name || '')),
            voterId: member.voterId || '',
            boothNumber: member.boothNumber ?? '',
            pollingStationAddress: member.pollingStationAddress || '',
            gender: await translateToMarathi(safeString(member.gender || '')),
            age: member.age ?? '',
          }))
        )
        : [];

      // Mobile: Try both image and text printing
      let printSuccess = false;
      let errorMessage = '';

      try {
        console.log('Attempting image-based printing...');
        await printReceiptAsImage(
          connection.characteristic,
          isFamily,
          translatedVoter,
          translatedFamily
        );
        printSuccess = true;
      } catch (imageError) {
        console.warn('Image printing failed, trying text-based...', imageError);
        errorMessage = imageError.message;

        try {
          await printViaText(
            connection.characteristic,
            isFamily,
            translatedVoter,
            translatedFamily
          );
          printSuccess = true;
        } catch (textError) {
          console.error('Text printing also failed:', textError);
          errorMessage += `\nText printing failed: ${textError.message}`;
        }
      }

      if (printSuccess) {
        alert(
          isFamily
            ? 'कुटुंब तपशील यशस्वीरित्या प्रिंट झाले! 🎉'
            : 'मतदाराची माहिती यशस्वीरित्या प्रिंट झाली! 🎉'
        );
      } else {
        throw new Error(`Printing failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Printing failed:', error);
      globalBluetoothConnection.connected = false;
      globalBluetoothConnection.device = null;
      globalBluetoothConnection.characteristic = null;
      setBluetoothConnected(false);
      setPrinterDevice(null);
      setPrinterCharacteristic(null);

      alert('प्रिंटिंग अयशस्वी: ' + (error?.message || error));
    } finally {
      setPrinting(false);
    }
  };

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';

    const s = String(str);

    if (/[0-9]/.test(s)) {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 🔸 MOBILE OPTIMIZED: printReceiptAsImage
  const printReceiptAsImage = async (characteristic, isFamily, voterData, familyData) => {
    return new Promise(async (resolve, reject) => {
      let safeDiv = null;

      try {
        ensureDevanagariFont();

        // Wait for fonts to load
        await new Promise(resolve => setTimeout(resolve, 500));

        safeDiv = document.createElement('div');
        safeDiv.id = 'voter-receipt-printable-temp-mobile';

        const PRINT_WIDTH = 240; // Fixed width for 2-inch printer

        safeDiv.style.width = `${PRINT_WIDTH}px`;
        safeDiv.style.padding = '4px';
        safeDiv.style.background = '#ffffff';
        safeDiv.style.color = '#000000';
        safeDiv.style.fontFamily = `"Noto Sans Devanagari", "Roboto", sans-serif`;
        safeDiv.style.fontSize = '18px';
        safeDiv.style.lineHeight = '1.3';
        safeDiv.style.position = 'fixed';
        safeDiv.style.left = '-9999px';
        safeDiv.style.top = '0';
        safeDiv.style.visibility = 'hidden';
        safeDiv.style.zIndex = '-9999';
        safeDiv.style.boxSizing = 'border-box';

        safeDiv.style.webkitFontSmoothing = 'antialiased';
        safeDiv.style.mozOsxFontSmoothing = 'grayscale';

        const pollingStation = escapeHtml(voterData.pollingStationAddress || '');

        let html = `
         <img src="${escapeHtml(RECEIPT_IMAGE_URL)}" alt="logo" style="width:100px;height:100px;object-fit:cover;margin:0 auto 6px;display:block;" />
        <div style="text-align:center;font-weight:bold;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:8px;">
          ${escapeHtml(candidateInfo.party)}<br/>
          <div style="font-size:18px;margin:4px 0;">${escapeHtml(candidateInfo.name)}</div>
          <div style="font-size:14px;">${escapeHtml(candidateInfo.slogan)}</div>
          <div style="font-size:14px;margin-top:4px;padding-bottom:8px;">${escapeHtml(candidateInfo.area)}</div>
        </div>
      `;

        if (isFamily && Array.isArray(familyData) && familyData.length > 0) {
          html += `
          <div style="text-align:center;margin-top:6px;font-size:14px;font-weight:bold;">कुटुंब तपशील</div>
          
          <!-- Main Voter Data -->
          <div style="margin-top:6px;font-size:18px;margin-bottom:2px;border-bottom:1px solid #000;padding-bottom:10px;">
            <div style="font-weight:bold;">1) ${escapeHtml(voterData.name || '')}</div>
            <div style="margin-top:4px;">अनुक्रमांक: ${escapeHtml(voterData.serialNumber || '')}</div>
            <div style="margin-top:2px;">मतदार आयडी: ${escapeHtml(voterData.voterId || '')}</div>
            <div style="margin-top:2px;">बूथ क्रमांक: ${escapeHtml(voterData.boothNumber || '')}</div>
            <div style="margin-top:2px;">लिंग: ${escapeHtml(voterData.gender || '')}</div>
            <div style="margin-top:2px;">वय: ${escapeHtml(voterData.age || '')}</div>
            <div style="margin-top:4px;font-size:18px;word-wrap:break-word;">
              मतदान केंद्र: ${pollingStation}
            </div>
          </div>
        `;

          // Family Members
          familyData.forEach((m, i) => {
            const memberPollingStation = escapeHtml(m.pollingStationAddress || '');
            html += `
            <div style="margin-top:6px;font-size:18px;margin-bottom:2px;border-bottom:1px solid #000;padding-bottom:10px;">
              <div style="font-weight:bold;">${i + 2}) ${escapeHtml(m.name || '')}</div>
              <div style="margin-top:4px;">अनुक्रमांक: ${escapeHtml(m.serialNumber || '')}</div>
              <div style="margin-top:2px;">मतदार आयडी: ${escapeHtml(m.voterId || '')}</div>
              <div style="margin-top:2px;">बूथ क्रमांक: ${escapeHtml(m.boothNumber || '')}</div>
              <div style="margin-top:2px;">लिंग: ${escapeHtml(m.gender || '')}</div>
              <div style="margin-top:2px;">वय: ${escapeHtml(m.age || '')}</div>
              <div style="margin-top:4px;font-size:18px;word-wrap:break-word;">
                मतदान केंद्र: ${memberPollingStation}
              </div>
            </div>
          `;
          });

          html += `
          <div style="margin-top:10px;border-top:1px solid #000;padding-top:8px;font-size:18px;line-height:1.3;">
           ${candidateInfo.messagePrinting || ''}
          </div>
          <div style="margin-top:10px;text-align:center;font-weight:bold;">${escapeHtml(candidateInfo.name || '')}</div>
          <div style="margin-top:20px;text-align:center;"></div>
        `;
        } else {
          html += `
          <div style="text-align:center;margin-top:6px;font-weight:bold;">मतदार तपशील</div>
          <div style="margin-top:6px;"><b>नाव:</b> ${escapeHtml(voterData.name || '')}</div>
          <div style="margin-top:4px;"><b>मतदार आयडी:</b> ${escapeHtml(voterData.voterId || '')}</div>
          <div style="margin-top:4px;"><b>अनुक्रमांक:</b> ${escapeHtml(voterData.serialNumber || '')}</div>
          <div style="margin-top:4px;"><b>बूथ क्रमांक:</b> ${escapeHtml(voterData.boothNumber || '')}</div>
          <div style="margin-top:4px;"><b>लिंग:</b> ${escapeHtml(voterData.gender || '')}</div>
          <div style="margin-top:4px;"><b>वय:</b> ${escapeHtml(voterData.age || '')}</div>
          <div style="margin-top:6px;margin-bottom:10px;word-wrap:break-word;">
            <b>मतदान केंद्र:</b> ${pollingStation}
          </div>
         <div style="margin-top:10px;border-top:1px solid #000;padding-top:8px;font-size:18px;line-height:1.3;">
           ${candidateInfo.messagePrinting || ''}
          </div>
          <div style="margin-top:10px;text-align:center;font-weight:bold;">${escapeHtml(candidateInfo.name || '')}</div>
          <div style="margin-top:5px;"></div>
        `;
        }

        safeDiv.innerHTML = html;
        document.body.appendChild(safeDiv);
        safeDiv.style.visibility = 'visible';

        // Force reflow
        safeDiv.offsetHeight;

        try {
          // Optimized html2canvas settings for thermal printer
          const canvas = await html2canvas(safeDiv, {
            scale: 1.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: false,
            width: PRINT_WIDTH,
            height: safeDiv.scrollHeight,
            logging: false,
            imageTimeout: 15000,
            removeContainer: false,
            foreignObjectRendering: false,
            onclone: (clonedDoc) => {
              const clonedDiv = clonedDoc.getElementById('voter-receipt-printable-temp-mobile');
              if (clonedDiv) {
                clonedDiv.style.fontFamily = `"Noto Sans Devanagari", "Roboto", sans-serif`;
                clonedDiv.style.background = '#ffffff';
                clonedDiv.style.color = '#000000';
              }
            }
          });

          console.log('Canvas created:', canvas.width, 'x', canvas.height);

          // Convert to ESC/POS raster
          const escImage = canvasToEscPosRaster(canvas);

          // Create complete command sequence
          const init = new Uint8Array([0x1B, 0x40]); // Initialize printer
          const alignCenter = new Uint8Array([0x1B, 0x61, 0x01]); // Center alignment

          // Final feed and cut commands (MORE PAPER FEED TO ENSURE COMPLETION)
          const feedAndCut = new Uint8Array([
            0x0A, 0x0A, 0x0A, 0x0A, // Feed 4 lines
            0x1D, 0x56, 0x42, 0x00  // Full cut (0x42 for full cut, 0x00 for feed distance)
          ]);

          // Combine all commands
          const completeCommand = new Uint8Array(
            init.length +
            alignCenter.length +
            escImage.length +
            feedAndCut.length
          );

          let offset = 0;
          completeCommand.set(init, offset);
          offset += init.length;

          completeCommand.set(alignCenter, offset);
          offset += alignCenter.length;

          completeCommand.set(escImage, offset);
          offset += escImage.length;

          completeCommand.set(feedAndCut, offset);

          // Send complete command in optimized chunks
          const CHUNK_SIZE = 180; // Optimal for Bluetooth LE
          let chunksSent = 0;

          for (let i = 0; i < completeCommand.length; i += CHUNK_SIZE) {
            const chunk = completeCommand.slice(i, Math.min(i + CHUNK_SIZE, completeCommand.length));

            try {
              if (characteristic.properties.writeWithoutResponse) {
                await characteristic.writeValueWithoutResponse(chunk);
              } else {
                await characteristic.writeValue(chunk);
              }
              chunksSent++;

              // Small delay between chunks but not too much
              if (i + CHUNK_SIZE < completeCommand.length) {
                await new Promise(r => setTimeout(r, 20));
              }
            } catch (chunkError) {
              console.warn('Chunk send error, retrying with smaller size:', chunkError);

              // Retry with smaller chunks
              const SMALL_CHUNK = 60;
              for (let j = 0; j < chunk.length; j += SMALL_CHUNK) {
                const smallChunk = chunk.slice(j, Math.min(j + SMALL_CHUNK, chunk.length));
                try {
                  if (characteristic.properties.writeWithoutResponse) {
                    await characteristic.writeValueWithoutResponse(smallChunk);
                  } else {
                    await characteristic.writeValue(smallChunk);
                  }
                  await new Promise(r => setTimeout(r, 10));
                } catch (smallError) {
                  console.error('Failed to send even small chunk:', smallError);
                  throw new Error('Printer communication failed');
                }
              }
            }
          }

          console.log(`Successfully sent ${chunksSent} chunks`);

          // FINAL VERIFICATION - Send additional feed to ensure print completes
          try {
            await new Promise(r => setTimeout(r, 100)); // Wait for printer to process

            // Send final feed command
            const finalFeed = new Uint8Array([0x0A, 0x0A]);
            if (characteristic.properties.writeWithoutResponse) {
              await characteristic.writeValueWithoutResponse(finalFeed);
            } else {
              await characteristic.writeValue(finalFeed);
            }

            await new Promise(r => setTimeout(r, 200)); // Wait for final processing

          } catch (finalError) {
            console.log('Final feed not sent, but printing likely completed');
          }

          resolve();

        } catch (canvasError) {
          console.error('Canvas creation error:', canvasError);
          reject(canvasError);
        }

      } catch (error) {
        console.error('Print error:', error);
        reject(error);

      } finally {
        // Clean up DOM element
        if (safeDiv && document.body.contains(safeDiv)) {
          try {
            document.body.removeChild(safeDiv);
          } catch (e) {
            console.log('Cleanup error:', e);
          }
        }
      }
    });
  };

  // 🔸 MOBILE OPTIMIZED: Text-based printing as fallback
  const printViaText = async (characteristic, isFamily, voterData, familyData) => {
    try {
      const encoder = new TextEncoder();
      const commands = [];

      // Initialize printer
      commands.push(new Uint8Array([0x1B, 0x40]));

      // Center align
      commands.push(new Uint8Array([0x1B, 0x61, 0x01]));

      // Double height and width for title
      commands.push(new Uint8Array([0x1D, 0x21, 0x11]));

      // Title
      commands.push(encoder.encode(`${candidateInfo.party}\n`));
      commands.push(encoder.encode(`${candidateInfo.name}\n\n`));

      // Reset text size
      commands.push(new Uint8Array([0x1D, 0x21, 0x00]));

      // Left align for details
      commands.push(new Uint8Array([0x1B, 0x61, 0x00]));

      if (isFamily && Array.isArray(familyData) && familyData.length > 0) {
        commands.push(encoder.encode('कुटुंब तपशील\n\n'));

        // Main voter
        commands.push(encoder.encode(`1) ${voterData.name}\n`));
        commands.push(encoder.encode(`अनुक्रमांक: ${voterData.serialNumber}\n`));
        commands.push(encoder.encode(`मतदार आयडी: ${voterData.voterId}\n`));
        commands.push(encoder.encode(`बूथ: ${voterData.boothNumber}\n`));
        commands.push(encoder.encode(`लिंग: ${voterData.gender}\n`));
        commands.push(encoder.encode(`वय: ${voterData.age}\n`));
        commands.push(encoder.encode(`मतदान केंद्र: ${voterData.pollingStationAddress}\n\n`));

        // Family members
        familyData.forEach((member, index) => {
          commands.push(encoder.encode(`${index + 2}) ${member.name}\n`));
          commands.push(encoder.encode(`अनुक्रमांक: ${member.serialNumber}\n`));
          commands.push(encoder.encode(`मतदार आयडी: ${member.voterId}\n`));
          commands.push(encoder.encode(`बूथ: ${member.boothNumber}\n`));
          commands.push(encoder.encode(`लिंग: ${member.gender}\n`));
          commands.push(encoder.encode(`वय: ${member.age}\n`));
          commands.push(encoder.encode(`मतदान केंद्र: ${member.pollingStationAddress}\n\n`));
        });
      } else {
        commands.push(encoder.encode('मतदार तपशील\n\n'));
        commands.push(encoder.encode(`नाव: ${voterData.name}\n`));
        commands.push(encoder.encode(`मतदार आयडी: ${voterData.voterId}\n`));
        commands.push(encoder.encode(`अनुक्रमांक: ${voterData.serialNumber}\n`));
        commands.push(encoder.encode(`बूथ: ${voterData.boothNumber}\n`));
        commands.push(encoder.encode(`लिंग: ${voterData.gender}\n`));
        commands.push(encoder.encode(`वय: ${voterData.age}\n`));
        commands.push(encoder.encode(`मतदान केंद्र: ${voterData.pollingStationAddress}\n\n`));
      }

      // Message
      commands.push(encoder.encode(`${candidateInfo.messagePrinting || ''}\n\n`));

      // Center align for signature
      commands.push(new Uint8Array([0x1B, 0x61, 0x01]));
      commands.push(encoder.encode(`${candidateInfo.name}\n`));

      // Feed and cut
      commands.push(new Uint8Array([0x0A, 0x0A, 0x0A]));
      commands.push(new Uint8Array([0x1D, 0x56, 0x00]));

      // Send all commands with mobile-optimized delays
      for (const cmd of commands) {
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(cmd);
        } else {
          await characteristic.writeValue(cmd);
        }
        // Longer delay for mobile
        await new Promise(resolve => setTimeout(resolve, isMobileDevice() ? 100 : 50));
      }

      return true;
    } catch (error) {
      console.error('Text printing failed:', error);
      throw error;
    }
  };

  const disconnectBluetooth = async () => {
    if (globalBluetoothConnection.device && globalBluetoothConnection.device.gatt.connected) {
      try {
        await globalBluetoothConnection.device.gatt.disconnect();
        console.log('Bluetooth disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }

    globalBluetoothConnection.device = null;
    globalBluetoothConnection.characteristic = null;
    globalBluetoothConnection.connected = false;

    setBluetoothConnected(false);
    setPrinterDevice(null);
    setPrinterCharacteristic(null);

    alert('Bluetooth printer disconnected');
  };

  return (
    <>
      <ContactModal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          setWhatsappNumber('');
        }}
        title="व्हॉट्सअॅप क्रमांक प्रविष्ट करा"
        number={whatsappNumber}
        setNumber={setWhatsappNumber}
        onConfirm={confirmWhatsAppShare}
        type="whatsapp"
      />

      <ContactModal
        isOpen={showCallModal}
        onClose={() => {
          setShowCallModal(false);
          setWhatsappNumber('');
        }}
        title="कॉल करण्यासाठी क्रमांक प्रविष्ट करा"
        number={whatsappNumber}
        setNumber={setWhatsappNumber}
        onConfirm={confirmCall}
        type="call"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="flex items-center justify-between mb-4">
          <ActionBtn
            icon={FaWhatsapp}
            label="WhatsApp"
            onClick={() => handleWhatsAppShare(false)}
            color="bg-green-500 hover:bg-green-600"
            disabled={!voterData}
          />
          <ActionBtn
            icon={FiPrinter}
            label="Print"
            onClick={() => printViaBluetooth(false)}
            color="bg-indigo-600 hover:bg-indigo-700"
            disabled={printing || !voterData}
          />
          <ActionBtn
            icon={FiShare2}
            label="Share"
            onClick={() => navigator.share?.({
              title: `${candidateInfo.name}`,
              text: `Voter Details: ${voterData?.name}, Voter ID: ${voterData?.voterId}, Booth: ${voterData?.boothNumber}\n\nVisit: ${WEBSITE_URL}`,
            })}
            color="bg-purple-500 hover:bg-purple-600"
            disabled={!voterData}
          />
          <ActionBtn
            icon={FiPhone}
            label="Call"
            onClick={handleCall}
            color="bg-blue-400 hover:bg-blue-500"
            disabled={!voterData}
          />
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiBluetooth className={bluetoothConnected ? "text-green-500" : "text-gray-400"} />
              <span className="text-xs text-gray-600">Printer: {bluetoothConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {bluetoothConnected && (
              <button
                onClick={disconnectBluetooth}
                className="text-red-600 text-xs hover:text-red-700 font-medium"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white py-4 px-5 rounded-xl font-medium transition-all duration-200 flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md`}
  >
    <Icon className="text-lg" />
  </button>
);

export default BluetoothPrinter;