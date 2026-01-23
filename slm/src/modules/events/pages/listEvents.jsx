import { 
  Box, Card, CardContent, CardHeader, CardActions, 
  Table, TableHead, TableRow, TableCell, TableBody, 
  Button, CircularProgress, IconButton, Collapse, Typography, TextField, TablePagination
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import React, { useState, useEffect } from 'react';
import { getEventsListService } from '../services/events.service';

export default function ListEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [totalCount, setTotalCount] = useState(0); // total de registros del backend

  const [params, setParams] = useState({
    pageNumber: 1,
    pageLength: 10,
    search: ''
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getEventsListService(params);
      setEvents(data.data.data || []);
      setTotalCount(data.data.pagination.total || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [params]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePageChange = (event, newPage) => {
    setParams((prev) => ({ ...prev, pageNumber: newPage + 1 }));
  };

  const handleRowsPerPageChange = (event) => {
    setParams((prev) => ({ ...prev, pageLength: parseInt(event.target.value, 10), pageNumber: 1 }));
  };

  const handleSearchChange = (event) => {
    setParams((prev) => ({ ...prev, search: event.target.value, pageNumber: 1 }));
  };

  return (
    <main>
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 1200 }}>
          <CardHeader 
            title="Lista de Cotizaciones" 
            subheader={
              <TextField
                size="small"
                label="Buscar..."
                value={params.search}
                onChange={handleSearchChange}
                sx={{ mt: 1, width: { xs: '100%', sm: 300 } }}
              />
            }
          />
          <CardContent sx={{ overflowX: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>ID</TableCell>
                    <TableCell>Tipo Evento</TableCell>
                    <TableCell>Cliente ID</TableCell>
                    <TableCell>Fecha Evento</TableCell>
                    <TableCell>No. Personas</TableCell>
                    <TableCell>Tipo Pago</TableCell>
                    <TableCell>Seguimiento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((event) => (
                    <React.Fragment key={event.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => toggleRow(event.id)}>
                            {expandedRows[event.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{event.id}</TableCell>
                        <TableCell>{event.tipo_evento}</TableCell>
                        <TableCell>{event.cliente_id}</TableCell>
                        <TableCell>{event.fecha_evento} {event.hora_evento}</TableCell>
                        <TableCell>{event.no_personas}</TableCell>
                        <TableCell>{event.tipo_pago === 1 ? 'Efectivo' : 'Tarjeta'}</TableCell>
                        <TableCell>
                          {event.url_seguimiento ? (
                            <Button variant="outlined" size="small" href={event.url_seguimiento} target="_blank">
                              Ver
                            </Button>
                          ) : '-'}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={8} sx={{ p: 0, borderBottom: 0 }}>
                          <Collapse in={expandedRows[event.id]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>Detalles adicionales</Typography>
                              <Typography variant="body2"><strong>Domicilio Entrega:</strong> {event.domicilio_entrega}</Typography>
                              <Typography variant="body2"><strong>Domicilio Recolección:</strong> {event.domicilio_recoleccion}</Typography>
                              <Typography variant="body2"><strong>Depósito:</strong> ${event.deposito}</Typography>
                              <Typography variant="body2"><strong>Descuento:</strong> {event.descuento}%</Typography>
                              <Typography variant="body2"><strong>Lavado/Desinfección:</strong> {event.lavado_desinfeccion === "1" ? 'Sí' : 'No'}</Typography>
                              <Typography variant="body2"><strong>Correcto Datos:</strong> {event.correct_datos ? 'Sí' : 'No'}</Typography>
                              <Typography variant="body2"><strong>Acepta Políticas:</strong> {event.accept_politicas ? 'Sí' : 'No'}</Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {/* PAGINACIÓN */}
          <TablePagination
            component="div"
            count={totalCount}
            page={params.pageNumber - 1}
            onPageChange={handlePageChange}
            rowsPerPage={params.pageLength}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 20, 50]}
          />
        </Card>
      </Box>
    </main>
  );
}
