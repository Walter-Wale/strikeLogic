module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define(
    "Match",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      flashscore_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "flashscore_id",
        validate: {
          notEmpty: true,
        },
        comment: "FlashScore's unique match identifier (e.g., 8QPNvIdp)",
      },
      match_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "match_date",
        comment: "Date of the match (YYYY-MM-DD format)",
      },
      match_time: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "match_time",
        comment: "Match time (e.g., 15:00:00)",
      },
      home_team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "home_team_id",
        comment: "Foreign key to teams table",
      },
      away_team_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "away_team_id",
        comment: "Foreign key to teams table",
      },
      league_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "league_name",
        comment: "League or competition name",
      },
      is_synced: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_synced",
        comment: "Flag indicating if H2H data has been scraped for this match",
      },
      flashscore_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "flashscore_url",
        comment:
          "Full FlashScore match URL path (e.g., /match/football/team1-Id/team2-Id/)",
      },
    },
    {
      tableName: "matches",
      timestamps: false,
      underscored: true,
    },
  );

  Match.associate = (models) => {
    // Match belongs to home team
    Match.belongsTo(models.Team, {
      foreignKey: "home_team_id",
      as: "homeTeam",
    });

    // Match belongs to away team
    Match.belongsTo(models.Team, {
      foreignKey: "away_team_id",
      as: "awayTeam",
    });

    // Match has many H2H history records
    Match.hasMany(models.H2HHistory, {
      foreignKey: "parent_match_id",
      as: "h2hRecords",
    });
  };

  return Match;
};
