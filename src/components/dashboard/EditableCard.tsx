import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Edit, Save, X } from 'lucide-react';

interface EditableCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  renderEditForm: (onSave: () => void, onCancel: () => void) => React.ReactNode;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

const EditableCard: React.FC<EditableCardProps> = ({ title, icon: Icon, children, renderEditForm, onSave, isSaving }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    await onSave();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <fieldset className="rounded-xl border-2 border-border p-4 h-full">
      <div className="flex justify-between items-center -mt-2 mb-2">
        <legend className="px-2 text-sm text-muted-foreground -ml-1 font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </legend>
        {!isEditing && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          {renderEditForm(handleSave, handleCancel)}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
    </fieldset>
  );
};

export default EditableCard;