import { BadRequestException, Injectable, Logger, NotFoundException, NotImplementedException, PreconditionFailedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityNotFoundError, Repository } from 'typeorm';
import { GameUpdateDto } from '../dto/gameUpdate.dto';
import { Game } from '../entities/game.entity';
@Injectable()
export class GameService {
	private readonly logger = new Logger(GameService.name);

	constructor(
		@InjectRepository(Game)
		private games: Repository<Game>,
	) {}

	

	async getGameById(id: number): Promise<Game> {
		try {
			this.logger.log("get by id", id)
			return await this.games.findOneByOrFail({ id });
		}
		catch (cause) {
			if (cause instanceof EntityNotFoundError) {
				const exc = new NotFoundException(`Found no game with id='${id}'`, { cause });
				this.logger.warn(exc)
				throw exc;
			}
			throw cause;
		}
	}

	async getGameBySeekUid(seekUid: string): Promise<Game> {
		try {
			return await this.games.findOneByOrFail( { seekUid });
		}
		catch (cause) {
			if (cause instanceof EntityNotFoundError) {
				const exc = new NotFoundException(`Found no game with seekUid='${seekUid}'`, { cause });
				this.logger.warn(exc)
				throw exc;
			}
			throw cause;
		}
	}

	async getGameByPlaytakId(playtakId: number): Promise<Game> {
		try {
			return await this.games.findOneByOrFail( { playtakId });
		}
		catch (cause) {
			if (cause instanceof EntityNotFoundError) {
				const exc = new NotFoundException(`Found no game with playtakId='${playtakId}'`, { cause });
				this.logger.warn(exc)
				throw exc;
			}
			throw cause;
		}
	}

	async setSeekUid(gameId: number, seekUid: string) {
		const game = await this.getGameById(gameId);
		if (game.playtakId) {
			throw new PreconditionFailedException(`Game id=${game.id} cannot be moved to 'seek created' because playtakId is already set (${game.playtakId})`);
		}
		this.games.update(game.id, { seekUid });
	}

	async moveGameToInProgress(seekUid: string, playtakId: number) {
		const game = await this.getGameBySeekUid(seekUid);
		if (game.playtakId) {
			throw new PreconditionFailedException(`Game id=${game.id} cannot be moved to 'in Progress' because playtakId is already set (${playtakId})`);
		}
		this.games.update(game.id, { playtakId });
	}

	async resetGameState(playtakId: number) {
		const game = await this.getGameByPlaytakId(playtakId);
		await this.games.update(game.id, { result: null, playtakId: null, seekUid: null });
	}

	async markGameAsFinished(playtakId: number, result: string) {
		const game = await this.getGameByPlaytakId(playtakId);
		if (game.result) {
			throw new PreconditionFailedException(`Game id=${game.id} cannot be marked as 'finished' with result='${result}' because it is already finished (previous result='${game.result}')`);
		}
		this.games.update(game.id, { result });
	}

	async handleGameUpdate(gameUpdate: GameUpdateDto): Promise<void> {
		if (gameUpdate?.game?.tournament != true) {
			this.logger.debug("Ignoring GameUpdate for non-tournament game", gameUpdate);
			throw new NotImplementedException("Non-tournament games are currently ignored")
		}
		if (!gameUpdate.game.seekUid) {
			throw new BadRequestException("GameUpdate.game.seekUid must be set");
		}
		if (!gameUpdate.game.id) {
			throw new BadRequestException("GameUpdate.game.id must be set");
		}

		switch (gameUpdate.type) {
			case "game.created": {
				this.logger.log(`Game #${gameUpdate.game.id} started: ${gameUpdate.game.white} vs ${gameUpdate.game.black}`);

				break;
			}
			case "game.ended": {
				this.logger.log(`Game #${gameUpdate.game.id} ended: ${gameUpdate.game.white} vs ${gameUpdate.game.black}`);
				
				if (!gameUpdate.game.result) {
					throw new BadRequestException("GameUpdate.game.result must be set when reporting a finished game");
				}
				if (gameUpdate.game.moves == null || gameUpdate.game.moves == undefined) {
					throw new BadRequestException("GameUpdate.game.moves must be set when reporting a finished game");
				}

				if (gameUpdate.game.moves.length === 0) {
					const game = await this.getGameByPlaytakId(gameUpdate.game.id);
					this.logger.debug(`Resetting game id=${game.id} since the game ended with no moves played`);
					this.resetGameState(gameUpdate.game.id);
				}
				else {
					const { white, black, result, id: playtakId } = gameUpdate.game;
					this.logger.debug(`Marking game ${white} vs ${black} as finished ${result} (playtakId=${playtakId})`);
					this.markGameAsFinished(playtakId, result);
				}
				break;
			}
			default:
				throw new NotImplementedException(`Cannot handle GameUpdate.type '${gameUpdate.type}'`);
		}
	}
}
