import { Button, Group, Modal, Text } from "@mantine/core";
import { MdOutlineClose } from "react-icons/md";

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isDeleting: boolean;
  isSubmitDisabled: boolean;
  label: string;
}

const ModalDeleteConfirmation: React.FC<DeleteDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isDeleting,
  isSubmitDisabled,
  label,
}) => {
  return (
    <Modal
      opened={open}
      onClose={onClose}
      withCloseButton
      closeButtonProps={{
        icon: <MdOutlineClose />,
      }}
      title="Delete Confirmation"
      size="lg"
      centered
    >
      <Text mb="md">{label}</Text>

      <Group justify="end" mt="md">
        <Button variant="default" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          color="red"
          onClick={onSubmit}
          loading={isDeleting}
          disabled={isDeleting || isSubmitDisabled}
        >
          Delete
        </Button>
      </Group>
    </Modal>
  );
};

export default ModalDeleteConfirmation;
