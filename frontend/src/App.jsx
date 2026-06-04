import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const iconPaths = [
  '/pins/marker-circle.svg',
  '/pins/marker-square.svg',
  '/pins/marker-diamond.svg',
  '/pins/marker-triangle.svg',
  '/pins/marker-pin.svg'
];

function escapeHtml(str) {
  return String(str).replace(/[&"'<>]/g, function (s) {
    return ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' })[s];
  });
}

function mapYolpAddressResults(data) {
  if (!data || !data.Feature) {
    return [];
  }
  return data.Feature.map((feature) => {
    const coords = feature.Geometry?.Coordinates ? feature.Geometry.Coordinates.split(',') : [];
    const lat = coords.length > 1 ? parseFloat(coords[1]) : NaN;
    const lon = coords.length > 1 ? parseFloat(coords[0]) : NaN;
    return {
      lat: lat,
      lon: lon,
      display_name: feature.Name || feature.Property?.Address || '',
      raw: feature
    };
  });
}

function mapYolpKeywordResults(data) {
  if (!data || !data.Feature) {
    return [];
  }
  return data.Feature.map((feature) => {
    const coords = feature.Geometry?.Coordinates ? feature.Geometry.Coordinates.split(',') : [];
    const lat = coords.length > 1 ? parseFloat(coords[1]) : NaN;
    const lon = coords.length > 1 ? parseFloat(coords[0]) : NaN;
    const title = feature.Name || feature.Property?.Name || '';
    const address = feature.Property?.Address || '';
    return {
      lat: lat,
      lon: lon,
      display_name: title + (address ? ' — ' + address : ''),
      raw: feature
    };
  });
}

const createIcons = () =>
  iconPaths.map((path) =>
    L.icon({
      iconUrl: path,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28]
    })
  );

export default function App() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const userMarkerMap = useRef({});
  const [searchMode, setSearchMode] = useState('address');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [markerCount, setMarkerCount] = useState(0);
  const icons = useRef(createIcons()).current;

  useEffect(() => {
    if (leafletMap.current) {
      return;
    }
    const map = L.map('map').setView([35.6804, 139.7690], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    map.on('click', (e) => {
      setPendingLatLng(e.latlng);
      setPlaceName('');
      setSelectedIcon(0);
      setShowModal(true);
    });
    leafletMap.current = map;

    const handleRemovePinClick = (event) => {
      if (!event.target.matches('.remove-pin-button')) {
        return;
      }
      const pinId = event.target.getAttribute('data-pin-id');
      if (!pinId) {
        return;
      }
      const marker = userMarkerMap.current[pinId];
      if (marker) {
        map.removeLayer(marker);
        delete userMarkerMap.current[pinId];
        alert('指定したピンを削除しました。');
      }
    };

    document.addEventListener('click', handleRemovePinClick);
    return () => document.removeEventListener('click', handleRemovePinClick);
  }, []);


  const API_BASE_URL = 'http://localhost:8080/api';

  const performSearch = async () => {
    if (!query) {
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setResults([]);

    try {
      const response = await fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}&type=${encodeURIComponent(searchMode)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      const mapped = searchMode === 'keyword' ? mapYolpKeywordResults(data) : mapYolpAddressResults(data);
      setResults(mapped.slice(0, searchMode === 'keyword' ? 2 : 1));
    } catch (error) {
      console.error(error);
      setErrorMessage('検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const addMarker = () => {
    if (!pendingLatLng || !leafletMap.current) {
      return;
    }
    const count = markerCount + 1;
    const markerId = `user-pin-${count}`;
    const label = placeName.trim() || `追加ピン #${count}`;
    const popupContent = `<b>${escapeHtml(label)}</b><br>緯度: ${pendingLatLng.lat.toFixed(6)}<br>経度: ${pendingLatLng.lng.toFixed(6)}<br><button type="button" class="remove-pin-button" data-pin-id="${markerId}">このピンを削除</button>`;
    const marker = L.marker(pendingLatLng, { icon: icons[selectedIcon] }).addTo(leafletMap.current).bindPopup(popupContent);
    marker.openPopup();
    userMarkerMap.current[markerId] = marker;
    setMarkerCount(count);
    setShowModal(false);
  };

  const selectResult = (item) => {
    if (!leafletMap.current) return;
    const latlng = L.latLng(parseFloat(item.lat), parseFloat(item.lon));
    leafletMap.current.flyTo(latlng, leafletMap.current.getZoom(), { duration: 0.7 });
    setPendingLatLng(latlng);
    setPlaceName(item.display_name.split(' — ')[0] || item.display_name);
    setSelectedIcon(0);
    setShowModal(true);
  };

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <h1>俺の地図 (React)</h1>
          <p className="subtitle">React + Leaflet で検索・ピン追加ができます。</p>
        </div>
      </header>

      <main className="content-card">
        <div className="info-panel">
          <p>地図をクリックするか、検索から場所を選択してピンを追加してください。</p>
        </div>

        <div id="search-bar">
          <select value={searchMode} onChange={(e) => setSearchMode(e.target.value)}>
            <option value="address">住所検索</option>
            <option value="keyword">キーワード検索</option>
          </select>
          <input
            id="search-input"
            type="text"
            value={query}
            placeholder={searchMode === 'keyword' ? 'キーワードで検索' : '住所で検索'}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
              }
            }}
          />
          <button id="search-button" type="button" onClick={performSearch}>
            検索
          </button>
        </div>

        {errorMessage && <div className="search-error">{errorMessage}</div>}
        {isLoading && <div className="search-status">検索中...</div>}

        <div id="search-results">
          {results.map((item, index) => (
            <div key={index} className="search-result-item">
              <div>
                <div className="result-title">{item.display_name.split(' — ')[0] || item.display_name}</div>
                <div className="result-subtitle">{item.display_name}</div>
              </div>
              <button type="button" onClick={() => selectResult(item)}>
                この場所にピン
              </button>
            </div>
          ))}
        </div>

        <div id="map" ref={mapRef} />
      </main>

      {showModal && (
        <div className="icon-modal open" role="dialog" aria-hidden="false">
          <div className="icon-modal-content">
            <h3>アイコンを選択</h3>
            <div>
              <label htmlFor="place-name-input">場所名（任意）</label>
              <input
                id="place-name-input"
                className="place-name-input"
                type="text"
                placeholder="例: お気に入りのカフェ"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
              />
            </div>
            <div className="modal-row">
              <label htmlFor="icon-select">アイコンを選択（プルダウン）</label>
              <div className="select-row">
                <select
                  id="icon-select"
                  value={selectedIcon}
                  onChange={(e) => setSelectedIcon(parseInt(e.target.value, 10))}
                >
                  {iconPaths.map((path, idx) => (
                    <option key={idx} value={idx}>
                      {path.split('/').pop()}
                    </option>
                  ))}
                </select>
                <img id="icon-select-preview" src={iconPaths[selectedIcon]} alt="選択中アイコン" />
              </div>
            </div>
            <div className="modal-actions">
              <button id="icon-modal-cancel" type="button" onClick={() => setShowModal(false)}>
                キャンセル
              </button>
              <button id="icon-modal-confirm" type="button" onClick={addMarker}>
                選択して追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}