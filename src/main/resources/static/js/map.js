(function() {
    var map = L.map('map').setView([35.6804, 139.7690], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    var iconPaths = [
        '/images/marker-circle.svg',
        '/images/marker-square.svg',
        '/images/marker-diamond.svg',
        '/images/marker-triangle.svg',
        '/images/marker-pin.svg'
    ];

    var icons = iconPaths.map(function(path) {
        return L.icon({
            iconUrl: path,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28]
        });
    });

    // モーダル内サムネイルの初期化とモーダル制御
    var pendingLatLng = null;
    var iconModal = document.getElementById('icon-modal');
    var iconSelect = document.getElementById('icon-select');
    var iconSelectPreview = document.getElementById('icon-select-preview');
    var iconModalConfirm = document.getElementById('icon-modal-confirm');
    var searchInput = document.getElementById('search-input');
    var searchButton = document.getElementById('search-button');
    var searchResults = document.getElementById('search-results');
    var placeNameInput = document.getElementById('place-name-input');

    function openIconModal(latlng) {
        pendingLatLng = latlng;
        iconModal.classList.add('open');
        iconModal.setAttribute('aria-hidden', 'false');
        if (placeNameInput) {
            placeNameInput.value = '';
            setTimeout(function() { placeNameInput.focus(); }, 10);
        }
    }
    function closeIconModal() {
        pendingLatLng = null;
        iconModal.classList.remove('open');
        iconModal.setAttribute('aria-hidden', 'true');
    }

    function escapeHtml(str) {
        return String(str).replace(/[&"'<>]/g, function(s) {
            return ({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'})[s];
        });
    }

    function mapYolpResults(data) {
        if (!data || !data.Feature) {
            return [];
        }
        return data.Feature.map(function(feature) {
            var coords = (feature.Geometry && feature.Geometry.Coordinates) ? feature.Geometry.Coordinates.split(',') : [];
            return {
                lat: coords.length > 1 ? coords[1] : '',
                lon: coords.length > 1 ? coords[0] : '',
                display_name: feature.Name || (feature.Property && feature.Property.Address) || '',
                raw: feature
            };
        });
    }

    // 検索実行
    function performSearch(query) {
        if (!query || !searchResults) return;
        searchResults.innerHTML = '検索中...';
        var url = '/api/search?query=' + encodeURIComponent(query);
        fetch(url, {headers: {'Accept': 'application/json'}})
            .then(function(res){
                if (!res.ok) {
                    return res.text().then(function(text) {
                        throw new Error('検索失敗: ' + res.status + ' ' + text);
                    });
                }
                return res.json();
            })
            .then(function(data){ return mapYolpResults(data); })
            .then(function(results){ renderSearchResults(results); })
            .catch(function(err){
                console.error(err);
                searchResults.innerHTML = '検索に失敗しました';
            });
    }

    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        if (!results || results.length === 0) {
            searchResults.textContent = '結果が見つかりませんでした。';
            return;
        }
        results.forEach(function(r, i) {
            var div = document.createElement('div');
            div.style = 'padding:8px; border:1px solid #eee; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;';
            var info = document.createElement('div');
            var title = r.display_name.split(',')[0] || r.display_name;
            info.innerHTML = '<div style="font-weight:600;">' + escapeHtml(title) + '</div><div style="font-size:0.85em;color:#666;margin-top:4px;">' + escapeHtml(r.display_name) + '</div>';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'この場所にピン';
            btn.style = 'margin-left:12px;';
            btn.addEventListener('click', function(){
                var latlng = L.latLng(parseFloat(r.lat), parseFloat(r.lon));
                // 事前に場所名をセットしてモーダルを開く
                if (typeof placeNameInput !== 'undefined' && placeNameInput) {
                    placeNameInput.value = title;
                }
                openIconModal(latlng);
            });
            div.appendChild(info);
            div.appendChild(btn);
            searchResults.appendChild(div);
        });
    }

    function renderIconModalThumbs() {
        if (!iconSelect) return;
        iconSelect.innerHTML = '';
        iconPaths.forEach(function(path, idx) {
            var opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = path.split('/').pop();
            iconSelect.appendChild(opt);
        });
        if (iconSelectPreview && iconPaths.length > 0) {
            iconSelectPreview.src = iconPaths[0];
        }
    }

    if (iconSelect) {
        iconSelect.addEventListener('change', function() {
            var idx = parseInt(iconSelect.value);
            if (!isNaN(idx) && iconSelectPreview) {
                iconSelectPreview.src = iconPaths[idx];
            }
        });
    }

    if (iconModalConfirm) {
        iconModalConfirm.addEventListener('click', function() {
            if (!pendingLatLng) return;
            var idx = parseInt(iconSelect.value);
            if (isNaN(idx)) return;
            userPinCount += 1;
            var markerId = 'user-pin-' + userPinCount;
            var placeName = (placeNameInput && placeNameInput.value && placeNameInput.value.trim()) ? placeNameInput.value.trim() : ('追加ピン #' + userPinCount);
            var popupContent = '<b>' + placeName + '</b><br>緯度: ' + pendingLatLng.lat.toFixed(6) + '<br>経度: ' + pendingLatLng.lng.toFixed(6) + '<br><button type="button" class="remove-pin-button" data-pin-id="' + markerId + '">このピンを削除</button>';
            var userMarker = L.marker(pendingLatLng, { icon: icons[idx] })
                .addTo(map)
                .bindPopup(popupContent);
            userMarker.openPopup();
            userMarkers.push({ markerId: markerId, marker: userMarker });
            userMarkerMap[markerId] = userMarker;
            closeIconModal();
        });
    }

    document.getElementById('icon-modal-cancel').addEventListener('click', function() {
        closeIconModal();
    });

    // サムネイルを描画
    renderIconModalThumbs();

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', function(){ performSearch(searchInput.value); });
        searchInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); performSearch(searchInput.value); } });
    }

    // 初期マーカーは表示しない（ユーザーがクリックして追加するのみ）

    var userMarkers = [];
    var userMarkerMap = {};
    var userPinCount = 0;

    function removeUserMarkerById(markerId) {
        var marker = userMarkerMap[markerId];
        if (!marker) {
            return false;
        }
        map.removeLayer(marker);
        delete userMarkerMap[markerId];
        userMarkers = userMarkers.filter(function(item) {
            return item.markerId !== markerId;
        });
        return true;
    }

    map.on('click', function(e) {
        // クリック時はモーダルを開いてアイコンを選択させる
        openIconModal(e.latlng);
    });

    // 「最後のピンを削除」機能は削除済み。個別削除はポップアップ内のボタンから行う。

    document.addEventListener('click', function(event) {
        if (!event.target.matches('.remove-pin-button')) {
            return;
        }
        var pinId = event.target.getAttribute('data-pin-id');
        if (!pinId) {
            return;
        }
        if (removeUserMarkerById(pinId)) {
            event.preventDefault();
            event.stopPropagation();
            alert('指定したピンを削除しました。');
        }
    });
})();
