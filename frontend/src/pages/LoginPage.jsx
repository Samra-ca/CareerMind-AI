import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const LoginPage = () => {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex font-body-md antialiased">
      <div className="flex w-full min-h-screen">
        {/* Left branding panel */}
        <div className="hidden lg:flex w-1/2 mesh-gradient flex-col justify-between p-12 border-r border-border-subtle relative">
          <div className="flex items-center gap-2 z-10">
            <Icon name="route" className="text-primary text-3xl" />
            <span className="font-headline-md font-bold text-primary tracking-tight">CareerMind.AI</span>
          </div>

          <div className="z-10 max-w-md">
            <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-md leading-tight">
              Elevate Your Professional Journey.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Access institutional-grade career intelligence and strategic mapping tools designed
              for the modern executive.
            </p>
            <div className="mt-stack-lg py-5 border-t border-border-subtle">
              <p className="font-display-lg text-3xl font-bold text-primary leading-tight tracking-tight mb-4">
                "Your career is a marathon, not a sprint. Map your trajectory with precision."
              </p>
              <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-primary"></div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                  Career Strategy Pro
                </p>
              </div>
            </div>
          </div>

          <div className="z-10 flex gap-6 text-on-surface-variant font-label-md text-label-md">
            <Link to="/register" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/register" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>

          <div className="absolute bottom-0 right-0 p-12 pointer-events-none opacity-20">
            <Icon name="analytics" className="text-primary-container" />
          </div>
        </div>

        {/* Right form panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-surface relative">
          <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden">
            <Icon name="route" className="text-primary text-2xl" />
            <span className="font-headline-md font-bold text-primary tracking-tight">CareerMind.AI</span>
          </div>
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;