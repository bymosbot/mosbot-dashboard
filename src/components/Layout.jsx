import { useLocation } from 'react-router-dom';
import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import MobileNavContext from './MobileNavContext';
import GlobalSessionPoller from './GlobalSessionPoller';

export default function Layout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <MobileNavContext.Provider value={() => setMobileNavOpen(true)}>
      {/* Global session polling - runs in background on all pages */}
      {!isLoginPage && <GlobalSessionPoller />}
      
      <div className="flex h-screen overflow-hidden bg-dark-950">
        {/* Mobile Navigation Drawer */}
        {!isLoginPage && (
          <Transition show={mobileNavOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 md:hidden" onClose={setMobileNavOpen}>
              <Transition.Child
                as={Fragment}
                enter="transition-opacity ease-linear duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/70" />
              </Transition.Child>

              <div className="fixed inset-0 flex">
                <Transition.Child
                  as={Fragment}
                  enter="transition ease-in-out duration-300 transform"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transition ease-in-out duration-300 transform"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                    <Transition.Child
                      as={Fragment}
                      enter="ease-in-out duration-300"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in-out duration-300"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                        <button
                          type="button"
                          className="-m-2.5 p-2.5"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          <span className="sr-only">Close sidebar</span>
                          <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                        </button>
                      </div>
                    </Transition.Child>
                    <Sidebar onCloseMobile={() => setMobileNavOpen(false)} />
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </Dialog>
          </Transition>
        )}

        {/* Desktop Sidebar - hidden on mobile */}
        {!isLoginPage && (
          <div className="hidden md:flex">
            <Sidebar />
          </div>
        )}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </MobileNavContext.Provider>
  );
}
