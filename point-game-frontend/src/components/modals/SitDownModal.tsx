import { useUIStore } from "../../stores/uiStore";


export function SitDownModal(){
    // state and logic
    const isOpen = useUIStore((state) => state.isSitDownModalOpen);
    if (!isOpen) return null;
    return (
        <div>
        {/* Backdrop - the dark overlay */}
        <div className="fixed inset-0 bg-black/50 z-50"></div>
        
        {/* Modal container - centers the modal */}
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Modal content - the white box */}
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
            <h2>Take Seat</h2>
            {/* Form will go here */}
            </div>
        </div>
        </div>
    );
}