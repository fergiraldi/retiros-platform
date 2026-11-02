import { Module } from '@nestjs/common';
import { EncontrosPublicosController } from './encontros-publicos.controller';
import { EncontrosPublicosService } from './encontros-publicos.service';
import { InscricaoPublicaService } from './inscricao-publica.service';

@Module({
  controllers: [EncontrosPublicosController],
  providers: [EncontrosPublicosService, InscricaoPublicaService],
})
export class PublicoModule {}
