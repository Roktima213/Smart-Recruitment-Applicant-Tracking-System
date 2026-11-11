import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home, Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full text-center bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-100 shadow-inner">
          <FileQuestion className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 tracking-wider uppercase mb-3">
          Error 404 • Page Not Found
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Lost in Space?
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          The recruitment page or resource you are looking for has been moved, archived, or never existed in the first place.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>

          <Link to="/">
            <Button variant="outline" size="md" leftIcon={<Home className="w-4 h-4" />}>
              Home
            </Button>
          </Link>

          <Link to="/jobs">
            <Button variant="primary" size="md" leftIcon={<Compass className="w-4 h-4" />}>
              Explore Jobs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
