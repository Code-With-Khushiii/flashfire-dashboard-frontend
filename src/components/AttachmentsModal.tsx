
import { X } from 'lucide-react';

function AttachmentsModal({ imageLink, setAttachmentsModalActiveStatus }) {
  return (
    <div className="fixed h-[100vh] w-[100vw]  inset-0 bg-white p-10 bg-opacity-50 flex items-center justify-center z-50">
      {/* <div className="bg-white p-4 rounded-lg shadow-lg relative max-w-[90vw] max-h-[90vh] w-full h-full overflow-auto"> */}
        <X
          onClick={() => setAttachmentsModalActiveStatus(false)}
          className="w-5 h-5 absolute top-2 right-2 cursor-pointer m-5"
        />
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={imageLink}
            alt="AttachmentsModal"
            className="w-[80vw] h-[90vh] object-contain "
          />
        </div>
      {/* </div> */}
    </div>
  );
}

export default AttachmentsModal;
