import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Button } from "@/components/ui/button";
import { Edit, Save, X } from 'lucide-react';
import { useState } from 'react'; // Import useState

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
    <Card className="h-full shadow-lg rounded-xl"> {/* Changed from fieldset to Card */}
      <CardHeader className="pb-2 flex-row items-center justify-between"> {/* Added flex-row, items-center, justify-between */}
        <CardTitle className="text-xl font-bold flex items-center gap-2"> {/* Changed to CardTitle */}
          <Icon className="h-5 w-5 text-primary" /> {/* Increased icon size for consistency with other cards */}
          {title}
        </CardTitle>
        {!isEditing && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}> {/* Adjusted size */}
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0"> {/* Adjusted padding */}
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
      </CardContent>
    </Card>
  );
};

export default EditableCard;