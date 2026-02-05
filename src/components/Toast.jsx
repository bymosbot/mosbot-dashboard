import { Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TOAST_TYPES = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-900/90',
    borderColor: 'border-green-500',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-red-900/90',
    borderColor: 'border-red-500',
    iconColor: 'text-red-400',
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-900/90',
    borderColor: 'border-blue-500',
    iconColor: 'text-blue-400',
  },
};

export default function Toast({ show, message, type = 'success', onClose }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.success;
  const Icon = config.icon;

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className={`pointer-events-auto min-w-[300px] max-w-sm overflow-hidden rounded-lg border ${config.borderColor} ${config.bgColor} shadow-lg backdrop-blur-sm`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-white break-words">{message}</p>
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                className="inline-flex rounded-md text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
}
