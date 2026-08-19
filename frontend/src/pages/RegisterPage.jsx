import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const FEATURES = [
  {
    icon: 'network_node',
    title: 'Predictive AI Analysis',
    desc: 'Data-driven mapping of your optimal career trajectory based on millions of structural data points.',
  },
  {
    icon: 'query_stats',
    title: 'Real-Time Market Insights',
    desc: 'Identify emerging skill demands and industry shifts before they become mainstream standards.',
  },
  {
    icon: 'architecture',
    title: 'Strategic Roadmapping',
    desc: 'Actionable, step-by-step algorithms to bridge the gap between your current role and maximum potential.',
  },
];

const RegisterPage = () => {
  return (
    <div className="bg-surface text-on-surface font-body-md h-screen flex antialiased overflow-hidden">
      <div className="flex w-full h-full">
        <main className="w-full lg:w-1/2 flex flex-col relative z-10 bg-surface border-r border-border-subtle overflow-y-auto custom-scrollbar">
          <div className="px-margin-mobile lg:px-margin-desktop mb-8 flex items-center gap-2">
            <Icon name="analytics" className="text-primary text-3xl" />
            <span className="font-headline-md text-headline-md text-primary font-bold tracking-tight">CareerMind.AI</span>
          </div>
          <div className="flex-1 flex flex-col justify-center px-margin-mobile lg:px-margin-desktop max-w-xl mx-auto w-full">
            <RegisterForm />
          </div>
        </main>

        <aside className="hidden lg:flex lg:w-1/2 relative bg-surface-container-lowest overflow-hidden flex-col justify-center px-16 xl:px-24">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen"
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDo0XO5LipEEAQtpSl4SJBvum41vQDGKCNrFXb8oUZ84EXSGVuWxxa1jU4Vf1gcANcgHPjCUu6Cr1F8sEAqZ_mLUC9m7xteBnF7PJIP7G0XmruIhm62sz3QQkYskZKTtjDloWepYel8qPwpU3oCtun5NOCs-hcZCOGah11lQHJ-kyHSUogF2aSP8g4BCMbv1HIUnGel54q1tCWjNqmQsLK0rdMSUFbLZi7ZyKXYtTQxFqmodVNzHZAz')" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest/90 via-surface-container-lowest/70 to-surface-container-lowest/90"></div>
          <div className="relative z-10 w-full max-w-lg">
            <div className="mb-12">
              <Icon name="format_quote" className="text-4xl text-primary opacity-80 mb-4 block" />
              <p className="font-headline-lg text-3xl xl:text-4xl text-on-surface tracking-tight leading-tight font-medium">
                "The best way to predict your future is to create it."
              </p>
            </div>
            <div className="space-y-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="mt-1 p-2.5 bg-surface-container border border-border-subtle rounded text-primary">
                    <Icon name={f.icon} />
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg text-on-surface font-semibold">{f.title}</h3>
                    <p className="font-body-md text-sm text-on-surface-variant mt-1">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default RegisterPage;