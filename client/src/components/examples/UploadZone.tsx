import { UploadZone } from '../UploadZone';

export default function UploadZoneExample() {
  return (
    <UploadZone 
      onFilesAccepted={(files) => console.log('Files accepted:', files)} 
    />
  );
}
