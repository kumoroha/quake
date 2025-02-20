document.addEventListener('DOMContentLoaded', async function() {
    const tsunamiApiUrl = 'https://api.p2pquake.net/v2/jma/tsunami'; // 津波の最新情報を取得するためのエンドポイント
    const earthquakeApiUrl = 'https://api.p2pquake.net/v2/jma/quake'; // P2PQuake APIのエンドポイント
    const tsunamiContainer = document.getElementById('tsunami-container');
    const tsunamiUpdatedTimeElement = document.getElementById('tsunami-updated-time');
    const earthquakeContainer = document.getElementById('earthquake-container');
    const earthquakeUpdatedTimeElement = document.getElementById('earthquake-updated-time');

    // 緯度・経度に方位記号（EWSN）を追加する関数
    function addDirection(lat, lon) {
        const latDirection = lat >= 0 ? 'N' : 'S';
        const lonDirection = lon >= 0 ? 'E' : 'W';
        return {
            latitude: `${latDirection} ${Math.abs(lat).toFixed(2)}`, // 小数点以下2桁まで表示
            longitude: `${lonDirection} ${Math.abs(lon).toFixed(2)}` // 小数点以下2桁まで表示
        };
    }

    // 津波情報を取得して表示する関数
    async function fetchTsunamiInfo() {
        try {
            const response = await fetch(tsunamiApiUrl);
            const data = await response.json();
            const updatedTime = new Date();
            tsunamiUpdatedTimeElement.innerText = `更新時刻: ${updatedTime.toLocaleString()}`; // 更新時刻を表示
            if (data.length > 0) {
                const tsunami = data[0]; // 最新の津波データ
                const warningMessage = (updatedTime - new Date(tsunami.time)) / (1000 * 60 * 60) <= 10 
                    ? '<p><strong>注意！！強い津波が発生する可能性があります。十分に警戒してください。</strong></p>' 
                    : '';
                const tsunamiInfo = `
                    <div style="display: flex; justify-content: space-between;">
                        ${warningMessage}
                        <p><strong>発表時刻:</strong> ${new Date(tsunami.time).toLocaleString()}</p>
                        <p><a href="https://www.jma.go.jp/bosai/map.html#contents=tsunami" target="_blank">詳しい情報はこちら</a></p>
                    </div>
                `;
                tsunamiContainer.innerHTML = tsunamiInfo;
            }
        } catch (error) {
            console.error('エラーが発生しました:', error);
            tsunamiContainer.innerHTML = '津波情報の取得ができませんでした。';
            tsunamiUpdatedTimeElement.innerText = `更新時刻: ${new Date().toLocaleString()}`; // 更新時刻を表示
        }
    }

    // 地震情報を取得して表示する関数
    async function fetchEarthquakeInfo() {
        try {
            const response = await fetch(earthquakeApiUrl);
            const data = await response.json();
            earthquakeUpdatedTimeElement.innerText = `更新時刻: ${new Date().toLocaleString()}`; // 更新時刻を表示
            earthquakeContainer.innerHTML = ''; // コンテナをクリア
            data.forEach(quake => {
                const quakeElement = document.createElement('div');

                // マグニチュードに応じてクラスを追加
                const magnitude = quake.earthquake.hypocenter.magnitude;
                if (magnitude <= 4.0) {
                    quakeElement.classList.add('earthquake-container', 'magnitude-low');
                } else if (magnitude <= 5.0) {
                    quakeElement.classList.add('earthquake-container', 'magnitude-moderate');
                } else if (magnitude <= 6.0) {
                    quakeElement.classList.add('earthquake-container', 'magnitude-high');
                } else {
                    quakeElement.classList.add('earthquake-container', 'magnitude-severe');
                }

                const quakeInfo = document.createElement('div');
                quakeInfo.classList.add('earthquake-info');

                const date = new Date(quake.time).toLocaleString();
                const place = quake.earthquake.hypocenter.name;
                const depth = quake.earthquake.hypocenter.depth;
                const latitude = quake.earthquake.hypocenter.latitude;
                const longitude = quake.earthquake.hypocenter.longitude;
                const tsunami = quake.earthquake.domesticTsunami; // 津波情報を取得

                const latLonWithDirection = addDirection(latitude, longitude);

                quakeInfo.innerHTML = `
                    <p><strong>発生日時:</strong> ${date}</p>
                    <p><strong>震源地:</strong> ${place}</p>
                    <p><strong>マグニチュード:</strong> ${magnitude}</p>
                    <p><strong>深さ:</strong> ${depth} km</p>
                    <p><strong>緯度:</strong> ${latLonWithDirection.latitude}</p>
                    <p><strong>経度:</strong> ${latLonWithDirection.longitude}</p>
                    <p><strong>津波情報:</strong> ${tsunami === "None" ? "津波の心配なし" : "津波の恐れあり"}</p>
                `;
                quakeElement.appendChild(quakeInfo);

                const mapDiv = document.createElement('div');
                mapDiv.classList.add('map');
                mapDiv.id = `map-${quake.id}`;
                quakeElement.appendChild(mapDiv);

                earthquakeContainer.appendChild(quakeElement);

                // Leaflet地図を表示する
                const map = L.map(`map-${quake.id}`).setView([latitude, longitude], 8);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                // マーカーを追加する
                L.marker([latitude, longitude]).addTo(map)
                    .bindPopup(`<b>${place}</b><br>M ${magnitude}, 深さ ${depth} km`)
                    .openPopup();
            });
        } catch (error) {
            console.error('エラーが発生しました:', error);
        }
    }

    // 並行して情報を取得する
    fetchTsunamiInfo(); // 先に津波情報を取得
    fetchEarthquakeInfo(); // 次に地震情報を取得

    // 定期的に津波情報を取得する（2分ごと）
    setInterval(fetchTsunamiInfo, 120000); // 2分ごとに情報を更新

    // 定期的に地震情報を取得する（5分ごと）
    setInterval(fetchEarthquakeInfo, 300000); // 5分ごとに情報を更新
});
