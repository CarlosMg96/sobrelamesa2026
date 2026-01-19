import { Toolbar, Typography, Divider } from '@mui/material';

const SidebarHeader = () => {
  return (
    <>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Sobre la Mesa
        </Typography>
      </Toolbar>
      <Divider />
    </>
  );
};

export default SidebarHeader;
