import React, { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';

export const FeedbackButton = React.memo(function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="feedback-fab"
        onClick={() => setOpen(true)}
        aria-label="Gửi phản hồi"
        title="Gửi phản hồi"
      >
        💬
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
});
