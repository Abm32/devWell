import React from 'react';
import { Moon, Sun, Github, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Header: React.FC = () => {
  const { user, signInWithGitHub, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Moon className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">DevWell</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600">
              Dashboard
            </Link>
            <Link to="/sleep" className="text-gray-700 hover:text-indigo-600">
              Sleep
            </Link>
            <Link to="/commits" className="text-gray-700 hover:text-indigo-600">
              Commits
            </Link>
            <Link to="/reports" className="text-gray-700 hover:text-indigo-600">
              Reports
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <Sun className="h-5 w-5 text-gray-600" />
            </button>
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={signInWithGitHub}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Github className="h-5 w-5" />
                <span>Connect GitHub</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};