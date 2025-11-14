import { Outlet } from 'react-router-dom';

const AdministratifLayout = () => {
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
};

export default AdministratifLayout;

