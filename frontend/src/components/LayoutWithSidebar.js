import Sidebar from './Sidebar';

const LayoutWithSidebar = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default LayoutWithSidebar;