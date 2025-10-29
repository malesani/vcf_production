import React from 'react';
import { MDBCard, MDBIcon } from 'mdb-react-ui-kit';

interface SectionCardProps {
  title: string;
  icon?: string;
  description: string;
  children: React.ReactNode;
}

export function SectionCard({ title, icon: icon, description, children }: SectionCardProps) {
  return (
    <MDBCard className="p-4 pb-2 mb-3">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <MDBIcon icon={icon} className="w-5 h-5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </MDBCard>
  );
}