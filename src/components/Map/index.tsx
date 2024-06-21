import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useResizeDetector } from 'react-resize-detector'

import MapTopBar from '#components/TopBar'
import { AppConfig } from '#lib/AppConfig'
import MarkerCategories, { Category } from '#lib/MarkerCategories'

import LeafleftMapContextProvider from './LeafletMapContextProvider'
import useMapContext from './useMapContext'
import useMarkerData from './useMarkerData'
import { toast } from 'sonner'

const LeafletCluster = dynamic(async () => (await import('./LeafletCluster')).LeafletCluster(), {
  ssr: false,
})
const CenterToMarkerButton = dynamic(async () => (await import('./ui/CenterButton')).CenterButton, {
  ssr: false,
})
const CustomMarker = dynamic(async () => (await import('./LeafletMarker')).CustomMarker, {
  ssr: false,
})
const LocateButton = dynamic(async () => (await import('./ui/LocateButton')).LocateButton, {
  ssr: false,
})
const LeafletMapContainer = dynamic(async () => (await import('./LeafletMapContainer')).LeafletMapContainer, {
  ssr: false,
})

const Places = [
  {
    id: 1,
    position: [-22.896, -43.1059],
    category: Category.CAT2,
    title: 'Dona Regina',
    address: 'Universidade La Salle',
    risk: true
  },
  {
    id: 2,
    position: [-22.9061, -43.0934],
    category: Category.CAT2,
    title: 'Claudia Figueiredo',
    address: 'Icarai',
    risk: false
  },
  {
    id: 3,
    position: [-22.9364, -43.0267],
    category: Category.CAT2,
    title: 'Maria Eduarda',
    address: 'Maravista',
    risk: false
  },
  {
    id: 4,
    position: [-22.9035, -43.1029],
    category: Category.CAT2,
    title: 'Renan Silv',
    addres: 'Icarai',
    risk: false
  },
  {
    id: 5,
    position: [-22.9067, -43.0569],
    category: Category.CAT2,
    title: 'Pedro Gonzaga',
    addres: 'Badu',
    risk: false,
  },
  {
    id: 6,
    position: [-22.9081, -43.1059],
    category: Category.HOUSE,
    title: 'Casa da familia Silva',
    addres: 'Icarai',
    risk: false,
  }
]
const calculateDistance = (pos1, pos2) => {
  const [lat1, lon1] = pos1;
  const [lat2, lon2] = pos2;
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distância em km
  return distance;
};

// Função para calcular uma nova posição
const getRandomPosition = (position, isRisk, stepSize) => {
  const [lat, lon] = position;

  if (isRisk) {
    // Mover na direção do ponto-alvo em pequenos incrementos
    const angle = Math.random() * 2 * Math.PI;
    const deltaLat = stepSize * Math.cos(angle);
    const deltaLon = stepSize * Math.sin(angle) / Math.cos(lat * Math.PI / 180);

    const newLat = lat + deltaLat;
    const newLon = lon + deltaLon;

    return [newLat, newLon];
  } else {
    // Caso contrário, mova aleatoriamente em uma pequena área
    const newLat = lat + (Math.random() - 0.5) * 0.001;
    const newLon = lon + (Math.random() - 0.5) * 0.001;
    return [newLat, newLon];
  }
};


const LeafletMapInner = () => {
  const [places, setPlaces] = useState(Places);
  const [initialPositions] = useState(Places.map(place => place.position));
  const stepSize = 3 / (111 * 30); // Aproximadamente 3 km em 30 passos (0.1 segundo cada)

  // Função para atualizar as posições
  const updatePositions = () => {
    setPlaces(prevPlaces =>
      prevPlaces.map((place, index) => {
        if (place.category !== Category.HOUSE) {
          const newPosition = getRandomPosition(place.position, place.risk, stepSize);
          if (place.risk) {
            const distance = calculateDistance(initialPositions[index], newPosition);
            // toast.info(`${place.title} está a ${distance} km`)
            if (distance > 0.7) {
              toast.warning(`${place.title} está muito longe!`);
            }
          }
          return { ...place, position: newPosition };
        }
        return place;
      })
    );
  };
  const { map } = useMapContext()
  const {
    width: viewportWidth,
    height: viewportHeight,
    ref: viewportRef,
  } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 200,
  })

  useEffect(() => {
    const intervalId = setInterval(updatePositions, 500); // 10 segundos
    return () => clearInterval(intervalId); // Limpa o intervalo quando o componente é desmontado
  }, []);

  const { clustersByCategory, allMarkersBoundCenter } = useMarkerData({
    locations: places,
    map,
    viewportWidth,
    viewportHeight,
  })

  const isLoading = !map || !viewportWidth || !viewportHeight

  /** watch position & zoom of all markers */
  useEffect(() => {
    if (!allMarkersBoundCenter || !map) return

    const moveEnd = () => {
      map.off('moveend', moveEnd)
    }

    map.flyTo(allMarkersBoundCenter.centerPos, allMarkersBoundCenter.minZoom, { animate: false })
    map.once('moveend', moveEnd)
  }, [allMarkersBoundCenter, map])

  return (
    <div className="absolute h-full w-full overflow-hidden" ref={viewportRef}>
      <MapTopBar />
      <div
        className={`absolute left-0 w-full transition-opacity ${isLoading ? 'opacity-0' : 'opacity-1 '}`}
        style={{
          top: AppConfig.ui.topBarHeight,
          width: viewportWidth ?? '100%',
          height: viewportHeight ? viewportHeight - AppConfig.ui.topBarHeight : '100%',
        }}
      >
        {allMarkersBoundCenter && clustersByCategory && (
          <LeafletMapContainer
            center={allMarkersBoundCenter.centerPos}
            zoom={allMarkersBoundCenter.minZoom}
            maxZoom={AppConfig.maxZoom}
            minZoom={AppConfig.minZoom}
          >
            {!isLoading ? (
              <>
                <CenterToMarkerButton
                  center={allMarkersBoundCenter.centerPos}
                  zoom={allMarkersBoundCenter.minZoom}
                />
                <LocateButton />
                {Object.values(clustersByCategory).map(item => (
                  <LeafletCluster
                    key={item.category}
                    icon={MarkerCategories[item.category as Category].icon}
                    color={MarkerCategories[item.category as Category].color}
                    chunkedLoading
                  >
                    {item.markers.map(marker => (
                      <CustomMarker place={marker} key={marker.id} />
                    ))}
                  </LeafletCluster>
                ))}
              </>
            ) : (
              // we have to spawn at least one element to keep it happy
              // eslint-disable-next-line react/jsx-no-useless-fragment
              <></>
            )}
          </LeafletMapContainer>
        )}
      </div>
    </div>
  )
}

// pass through to get context in <MapInner>
const Map = () => (
  <LeafleftMapContextProvider>
    <LeafletMapInner />
  </LeafleftMapContextProvider>
)

export default Map
