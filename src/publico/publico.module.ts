import { Module } from '@nestjs/common';
import { LimiteDeTaxaService } from '../limite-de-taxa/limite-de-taxa.service';
import { EncontrosPublicosController } from './encontros-publicos.controller';
import { EncontrosPublicosService } from './encontros-publicos.service';
import { InscricaoPublicaService } from './inscricao-publica.service';

@Module({
  controllers: [EncontrosPublicosController],
  // O limitador mora aqui enquanto a ficha for o único consumidor. A regeração
  // de Pix e o reenvio de link (RNF-012) precisam da MESMA instância — quando
  // chegarem, ele sobe para um módulo global, senão cada um conta sozinho.
  providers: [EncontrosPublicosService, InscricaoPublicaService, LimiteDeTaxaService],
})
export class PublicoModule {}
