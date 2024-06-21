import LatLngLogo from '#components/TopBar/LatLngLogo'
import { NavMenuVariant } from '#lib/AppConfig'


const MapTopBar = () => (
  <div
    className="absolute left-0 top-0 flex h-20 w-full items-center bg-dark p-3 shadow"
    style={{ zIndex: 1000 }}
  >
    <div className="flex w-full justify-between">
      <LatLngLogo />
    </div>
  </div>
)

export default MapTopBar
