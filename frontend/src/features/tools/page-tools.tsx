import ModalScrapeGroupFacebook from "@/features/tools/components/modal-scrape-group-facebook";
import { Box, Button, Group, Text } from "@mantine/core";
import { useState } from "react";
import { TiArrowBack } from "react-icons/ti";
import { useNavigate } from "react-router";

export default function PageTools() {
  const navigate = useNavigate();
  const [facebookGroupsModalOpen, setFacebookGroupsModalOpen] =
    useState(false);

  return (
    <Box px={20} py={10}>
      <Group mb="md">
        <Button
          variant="filled"
          color="primary"
          size="xs"
          onClick={() => navigate(-1)}
        >
          <TiArrowBack />
        </Button>
        <Text fw={600}>Tools Lainnya</Text>
      </Group>

      <Group>
        <Button
          variant="light"
          onClick={() => setFacebookGroupsModalOpen(true)}
        >
          Scrape My Groups (Facebook)
        </Button>
      </Group>

      <ModalScrapeGroupFacebook
        open={facebookGroupsModalOpen}
        onClose={() => setFacebookGroupsModalOpen(false)}
      />
    </Box>
  );
}
